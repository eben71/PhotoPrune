from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import Settings, get_settings
from app.core.security import (
    CorrelationIdMiddleware,
    GeneralAdmissionMiddleware,
    RequestBodyLimitMiddleware,
    RollingWindowLimiter,
    SafeExceptionMiddleware,
    ScanAdmissionController,
    correlation_id_from_scope,
    safe_validation_errors,
)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name)
    app.state.settings = settings
    app.state.scan_admission = ScanAdmissionController(
        rate_limit=settings.scan_admissions_per_minute,
        concurrency_limit=settings.scan_concurrency_limit,
    )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        correlation_id = correlation_id_from_scope(request.scope)
        return JSONResponse(
            status_code=422,
            content={
                "detail": safe_validation_errors(exc.errors()),
                "category": "request_validation",
                "correlationId": correlation_id,
            },
            headers={"X-Correlation-ID": correlation_id},
        )

    app.include_router(router)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PATCH"],
            allow_headers=["Content-Type", "X-Correlation-ID", "X-Scan-Explain"],
        )
    app.add_middleware(
        GeneralAdmissionMiddleware,
        limiter=RollingWindowLimiter(settings.api_requests_per_minute),
    )
    app.add_middleware(RequestBodyLimitMiddleware, max_bytes=settings.request_body_max_bytes)
    app.add_middleware(SafeExceptionMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    return app


app = create_app()
