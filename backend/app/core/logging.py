"""Logging configuration"""
import logging
import sys
from typing import Optional


def setup_logging(level: str = "INFO") -> None:
    """Set up logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("app.log", encoding="utf-8")
        ]
    )


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name or __name__)