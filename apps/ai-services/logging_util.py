import logging
import sys
from pythonjsonlogger import jsonlogger

_logger = None


def setup_logging():
    global _logger
    _logger = logging.getLogger(__name__)
    _logger.setLevel(logging.DEBUG)
    _logger.propagate = False
    _logger.handlers.clear()

    stdout_handler = logging.StreamHandler(stream=sys.stdout)
    stdout_handler.setLevel(logging.INFO)

    stderr_handler = logging.StreamHandler(stream=sys.stderr)
    stderr_handler.setLevel(logging.ERROR)

    formatter = jsonlogger.JsonFormatter(
        "%(levelname)s %(asctime)s %(message)s %(tenant_id)s"
    )
    stdout_handler.setFormatter(formatter)
    stderr_handler.setFormatter(formatter)
    _logger.addHandler(stdout_handler)
    _logger.addHandler(stderr_handler)


def error_log(message, tenant_id):
    _logger.error(message, extra={"tenant_id": tenant_id})


def info_log(message, tenant_id):
    _logger.info(message, extra={"tenant_id": tenant_id})


def debug_log(message, tenant_id):
    _logger.debug(message, extra={"tenant_id": tenant_id})


def warning_log(message, tenant_id):
    _logger.warning(message, extra={"tenant_id": tenant_id})
