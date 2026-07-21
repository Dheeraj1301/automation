"""In-process background worker for prospect enrichment jobs - crawls the
company's website and runs the AI analysis. No Celery/broker: just a
status column on EnrichmentJob that this asyncio loop polls, started once
at app startup (see app/main.py's lifespan) and stopped on shutdown.

Production runs 2 uvicorn worker processes, each running its own copy of
this loop - `SELECT ... FOR UPDATE SKIP LOCKED` is what keeps them from
double-processing the same job.
"""

import asyncio
from datetime import datetime, timezone

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.enrichment_job import STATUS_DONE, STATUS_FAILED as JOB_FAILED, STATUS_PENDING, STATUS_RUNNING, EnrichmentJob
from app.models.prospect import STATUS_ENRICHED, STATUS_ENRICHING, STATUS_FAILED as PROSPECT_FAILED, Prospect
from app.models.prospect_list import ProspectList
from app.services.prospect_ai import analyze_prospect, build_icp
from app.services.website_crawler import crawl_website

logger = get_logger(__name__)

POLL_INTERVAL_SECONDS = 3

_worker_task: asyncio.Task | None = None
_stop_event: asyncio.Event | None = None


async def start_worker() -> None:
    global _worker_task, _stop_event
    _stop_event = asyncio.Event()
    _worker_task = asyncio.create_task(_worker_loop())
    logger.info("enrichment_worker_started")


async def stop_worker() -> None:
    if _stop_event is not None:
        _stop_event.set()
    if _worker_task is not None:
        await _worker_task
    logger.info("enrichment_worker_stopped")


async def _worker_loop() -> None:
    assert _stop_event is not None
    while not _stop_event.is_set():
        try:
            processed = await asyncio.to_thread(_process_one_job)
        except Exception:
            logger.error("enrichment_worker_loop_error")
            processed = False

        if not processed:
            try:
                await asyncio.wait_for(_stop_event.wait(), timeout=POLL_INTERVAL_SECONDS)
            except asyncio.TimeoutError:
                pass


def _process_one_job() -> bool:
    """Runs in a worker thread (via asyncio.to_thread) so a slow crawl never
    blocks the event loop that's also serving API requests. Returns True if
    a job was found and processed (success or failure), False if the queue
    was empty."""
    db = SessionLocal()
    job_id = None
    prospect_id = None
    try:
        job = (
            db.query(EnrichmentJob)
            .filter(EnrichmentJob.status == STATUS_PENDING)
            .order_by(EnrichmentJob.created_at)
            .with_for_update(skip_locked=True)
            .first()
        )
        if job is None:
            return False

        job_id = job.id
        prospect_id = job.prospect_id
        job.status = STATUS_RUNNING
        job.started_at = datetime.now(timezone.utc)

        prospect = db.get(Prospect, prospect_id)
        if prospect is not None:
            prospect.status = STATUS_ENRICHING
        db.commit()

        if prospect is None:
            job.status = JOB_FAILED
            job.error_message = "Prospect no longer exists"
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            return True

        icp = build_icp(db.get(ProspectList, prospect.list_id))

        # Pure computation, no DB writes - safe even if it raises.
        crawl = crawl_website(prospect.website_url or "")
        analysis = analyze_prospect(prospect.company_name, crawl.combined_text, icp) if crawl.success else None

        # Re-fetch since the commit above may have expired these instances.
        prospect = db.get(Prospect, prospect_id)
        job = db.get(EnrichmentJob, job_id)

        if crawl.success and analysis is not None:
            prospect.crawled_data = {"pages_crawled": crawl.pages_crawled, "social_links": crawl.social_links}
            prospect.contact_page_url = crawl.contact_page_url or prospect.contact_page_url
            prospect.about_page_url = crawl.about_page_url or prospect.about_page_url
            prospect.contact_form_url = crawl.contact_form_url
            if crawl.emails and not prospect.public_email:
                prospect.public_email = crawl.emails[0]
            if crawl.phones and not prospect.public_phone:
                prospect.public_phone = crawl.phones[0]
            prospect.ai_summary = analysis["summary"]
            prospect.lead_score = analysis["score"]
            prospect.lead_score_breakdown = analysis["score_breakdown"]
            prospect.status = STATUS_ENRICHED
            prospect.error_message = None
            job.status = STATUS_DONE
        else:
            prospect.status = PROSPECT_FAILED
            prospect.error_message = crawl.error
            job.status = JOB_FAILED
            job.error_message = crawl.error

        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        return True

    except Exception as exc:
        db.rollback()
        logger.warning("enrichment_job_failed", job_id=str(job_id), error=str(exc))
        try:
            if job_id is not None:
                job = db.get(EnrichmentJob, job_id)
                if job is not None:
                    job.status = JOB_FAILED
                    job.error_message = str(exc)
                    job.finished_at = datetime.now(timezone.utc)
            if prospect_id is not None:
                prospect = db.get(Prospect, prospect_id)
                if prospect is not None:
                    prospect.status = PROSPECT_FAILED
                    prospect.error_message = str(exc)
            db.commit()
        except Exception:
            db.rollback()
        return True
    finally:
        db.close()
