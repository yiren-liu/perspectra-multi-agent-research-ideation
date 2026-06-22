import os
import time
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import PyMongoError

import platform

from db_utils.mongodb_utils.models import UserLog

from settings import app_settings
import logging

logger = logging.getLogger(__name__)

class MongoDBClient:
    """
    MongoDB Client.
    """

    def __init__(self) -> None:
        logger.info("Initializing MongoDB Client...")
        start = time.time()

        mongo_url = app_settings.mongo_url
        self.client = MongoClient(mongo_url)
        self.db = self.client[app_settings.mongo_db_name]

        end = time.time()
        logger.info(f"MongoDB Client initialized in {end - start} seconds.")

    def write_log(self, session_id: str, type: str, log_body: dict, user: str):
        user_log = UserLog(
            user=user,
            session_id=session_id,
            type=type,
            log_body=log_body,
            client_name=platform.node(),
            timestamp=datetime.now()
        )
        try:
            self.db["logs"].insert_one(user_log.dict())
        except PyMongoError as e:
            logger.error("Error when writing log to database: " + str(e))
        return user_log.dict()

if __name__ == "__main__":
    mongo_client = MongoDBClient()
    print(mongo_client.write_log("123", "test", {"test": "test"}, "test")) 