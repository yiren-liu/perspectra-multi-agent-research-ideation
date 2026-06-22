import abc

import os
import time
from datetime import datetime

import json

from supabase import create_client, Client
import platform


from db_utils import Singleton
from settings import app_settings
import logging

logger = logging.getLogger(__name__)

supabase_url: str = app_settings.supabase_url
supabase_service_key: str = app_settings.supabase_service_key


class RDSClient(metaclass=Singleton):
    """
    Supabase Client.
    """

    def __init__(self) -> None:
        logger.info("Initializing Supabase Client...")
        start = time.time()

        self.client: Client = create_client(supabase_url, supabase_service_key)

        end = time.time()
        logger.info(f"Supabase Client initialized in {end - start} seconds.")

    def write_log(self, session_id: str, type: str, log_body: dict, user: str):
        data = {
            "user": user,
            "session_id": session_id,
            "type": type,
            "log_body": json.dumps(log_body),
            "client_name": platform.node(),
        }
        try:
            response = self.client.table("coquest_block_dev").insert(data).execute()
            # if response.error:
            #     raise Exception(response.error)
        except Exception as e:
            logger.error("Error when writing log to database: " + str(e))
        return data

    def create_user_settings(self, user_id: str, quota_limit: int = 50):
        """
        Create a new user settings in the database, table user_settings.
        """
        try:
            self.client.table("user_settings").insert({"user_id": user_id, "quota_limit": quota_limit, "last_updated": datetime.now().isoformat()}).execute()
            return True
        except Exception as e:
            raise Exception("Error when creating new user settings: " + str(e))

    def get_user_quota(self, user_id: str):
        """
        Get the user's quota from the database, table user_settings.
        If the user does not exist in the database, create a new user with default quota. 
        """
        try:
            # first check if the user exists in the database
            response = self.client.table("user_settings").select("*").eq("user_id", user_id).execute()
            if len(response.data) > 0:
                return response.data[0]["quota_limit"]
            else:
                # Create a new user with default quota
                self.create_user_settings(user_id, 50)
                return 50
        except Exception as e:
            raise Exception("Error when getting user quota: " + str(e))
        

    def update_user_quota(self, user_id: str, quota_limit: int):
        """
        Update the user's quota in the database, table user_settings.
        """
        try:    
            self.client.table("user_settings").update({"quota_limit": quota_limit, "last_updated": datetime.now().isoformat()}).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            raise Exception("Error when updating user quota: " + str(e))
    
    def get_all_user_email_newsletter_subscribed(self) -> list[dict]:
        try:
            response = self.client.from_("user_settings_with_email").select("user_id, email").eq("is_newsletter_subscribed", True).execute()
            return response.data
        except Exception as e:
            raise Exception("Error when getting user email newsletter subscription: " + str(e))

    # Forum related methods
    def save_user_forum_thread(self, user_id: str, thread_id: str, thread_data: dict, is_favorited: bool = False):
        """
        Save a forum thread to the database, associated with a specific user.
        """
        try:
            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "thread_data": json.dumps(thread_data),
                "is_favorited": is_favorited,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
            self.client.table("user_forum_threads").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error when saving forum thread: {str(e)}")
            return False

    def update_user_forum_thread(self, user_id: str, thread_id: str, thread_data: dict):
        """
        Update an existing forum thread for a specific user.
        """
        try:
            data = {
                "thread_data": json.dumps(thread_data),
                "updated_at": datetime.now().isoformat(),
            }
            self.client.table("user_forum_threads").update(data)\
                .eq("user_id", user_id)\
                .eq("thread_id", thread_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error when updating forum thread: {str(e)}")
            return False

    def get_user_forum_thread(self, user_id: str, thread_id: str):
        """
        Get a specific forum thread for a user.
        """
        try:
            response = self.client.table("user_forum_threads")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("thread_id", thread_id)\
                .execute()
            
            if len(response.data) > 0:
                thread_data = json.loads(response.data[0]["thread_data"])
                thread_data["is_favorited"] = response.data[0].get("is_favorited", False)
                return thread_data
            return None
        except Exception as e:
            logger.error(f"Error when getting forum thread: {str(e)}")
            return None

    def get_user_forum_threads(self, user_id: str) -> list[dict]:
        """
        Get all forum threads for a specific user.
        """
        try:
            response = self.client.table("user_forum_threads")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("updated_at", desc=True)\
                .execute()
            
            threads = []
            for item in response.data:
                thread_data = json.loads(item["thread_data"])
                thread_data["is_favorited"] = item.get("is_favorited", False)
                threads.append(thread_data)
            return threads
        except Exception as e:
            logger.error(f"Error when getting forum threads: {str(e)}")
            return []

    def delete_user_forum_thread(self, user_id: str, thread_id: str):
        """
        Delete a forum thread for a specific user.
        """
        try:
            self.client.table("user_forum_threads")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("thread_id", thread_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error when deleting forum thread: {str(e)}")
            return False

    def toggle_favorite_thread(self, user_id: str, thread_id: str, is_favorited: bool = None):
        """
        Toggle or set the favorited status of a forum thread for a specific user.
        If is_favorited is provided, set to that value. Otherwise, toggle the current value.
        """
        try:
            current_time = datetime.now().isoformat()
            
            # If is_favorited is not provided, get the current value and toggle it
            if is_favorited is None:
                response = self.client.table("user_forum_threads")\
                    .select("is_favorited")\
                    .eq("user_id", user_id)\
                    .eq("thread_id", thread_id)\
                    .execute()
                
                if len(response.data) > 0:
                    current_status = response.data[0].get("is_favorited", False)
                    is_favorited = not current_status
                else:
                    # Thread doesn't exist
                    return False
            
            # Update the favorited status with fav_updated_at
            update_data = {
                "is_favorited": is_favorited, 
                "updated_at": current_time
            }
            
            # Only set fav_updated_at if the thread is being favorited
            # or if we're unfavoriting, but either way we're changing the favorite status
            update_data["fav_updated_at"] = current_time
            
            self.client.table("user_forum_threads")\
                .update(update_data)\
                .eq("user_id", user_id)\
                .eq("thread_id", thread_id)\
                .execute()
            
            return True
        except Exception as e:
            logger.error(f"Error when toggling favorite thread: {str(e)}")
            return False

    def get_favorite_threads(self, user_id: str):
        """
        Get all favorited forum threads for a specific user.
        """
        try:
            response = self.client.table("user_forum_threads")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("is_favorited", True)\
                .order("fav_updated_at", desc=True)\
                .execute()
            
            threads = []
            for item in response.data:
                thread_data = json.loads(item["thread_data"])
                thread_data["is_favorited"] = True  # These are all favorited by definition
                thread_data["fav_updated_at"] = item.get("fav_updated_at")  # Include the fav_updated_at timestamp
                threads.append(thread_data)
            return threads
        except Exception as e:
            logger.error(f"Error when getting favorite threads: {str(e)}")
            return []

    # Favorited posts methods
    def favorite_post(self, user_id: str, thread_id: str, post_id: str):
        """
        Mark a post or reply as favorited by a user.
        """
        try:
            current_time = datetime.now().isoformat()
            
            # Check if already favorited
            response = self.client.table("user_favorited_posts")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("post_id", post_id)\
                .execute()
            
            if len(response.data) > 0:
                # Already favorited, update the fav_updated_at timestamp
                self.client.table("user_favorited_posts")\
                    .update({
                        "updated_at": current_time,
                        "fav_updated_at": current_time
                    })\
                    .eq("user_id", user_id)\
                    .eq("post_id", post_id)\
                    .execute()
                return True
            
            # Add to favorites
            data = {
                "user_id": user_id,
                "thread_id": thread_id,
                "post_id": post_id,
                "created_at": current_time,
                "updated_at": current_time,
                "fav_updated_at": current_time
            }
            self.client.table("user_favorited_posts").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error when favoriting post: {str(e)}")
            return False

    def unfavorite_post(self, user_id: str, post_id: str):
        """
        Remove a post or reply from a user's favorites.
        """
        try:
            self.client.table("user_favorited_posts")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("post_id", post_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Error when unfavoriting post: {str(e)}")
            return False
    
    def toggle_favorite_post(self, user_id: str, thread_id: str, post_id: str):
        """
        Toggle whether a post is favorited by a user.
        """
        try:
            # Check if already favorited
            response = self.client.table("user_favorited_posts")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("post_id", post_id)\
                .execute()
            
            if len(response.data) > 0:
                # If already favorited, unfavorite it
                return self.unfavorite_post(user_id, post_id)
            else:
                # If not favorited, favorite it
                return self.favorite_post(user_id, thread_id, post_id)
        except Exception as e:
            logger.error(f"Error when toggling favorite post: {str(e)}")
            return False

    def get_favorited_posts(self, user_id: str, thread_id: str = None):
        """
        Get all post IDs favorited by a user.
        If thread_id is provided, filter by that thread.
        Returns a list of dicts with post_id and fav_updated_at.
        """
        try:
            query = self.client.table("user_favorited_posts")\
                .select("post_id, thread_id, fav_updated_at")\
                .eq("user_id", user_id)
            
            if thread_id:
                query = query.eq("thread_id", thread_id)
            
            # Order by fav_updated_at for most recently favorited posts first
            query = query.order("fav_updated_at", desc=True)
            
            response = query.execute()
            
            return [{"post_id": item["post_id"], "fav_updated_at": item.get("fav_updated_at")} for item in response.data]
        except Exception as e:
            logger.error(f"Error when getting favorited posts: {str(e)}")
            return []
    
    def get_favorited_posts_by_thread(self, user_id: str):
        """
        Get all favorited posts grouped by thread.
        Returns a dict with thread_id as key and a list of post data (with post_id and fav_updated_at) as value.
        """
        try:
            response = self.client.table("user_favorited_posts")\
                .select("post_id, thread_id, fav_updated_at")\
                .eq("user_id", user_id)\
                .order("fav_updated_at", desc=True)\
                .execute()
            
            result = {}
            for item in response.data:
                thread_id = item["thread_id"]
                post_data = {
                    "post_id": item["post_id"], 
                    "fav_updated_at": item.get("fav_updated_at")
                }
                
                if thread_id not in result:
                    result[thread_id] = []
                
                result[thread_id].append(post_data)
            
            # convert the result to a list of dicts
            result = [{"thread_id": thread_id, "posts": posts} for thread_id, posts in result.items()]
            
            return result
        except Exception as e:
            logger.error(f"Error when getting favorited posts by thread: {str(e)}")
            return {}

    def save_user_agent_settings(self, user_id: str, agent_name: str, settings: dict):
        """
        Save or update agent settings for a specific user.
        """
        try:
            # Check if the settings already exist
            response = self.client.table("user_agent_settings")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("agent_name", agent_name)\
                .execute()
            
            data = {
                "settings": json.dumps(settings),
                "updated_at": datetime.now().isoformat(),
            }
            
            if len(response.data) > 0:
                # Update existing settings
                self.client.table("user_agent_settings")\
                    .update(data)\
                    .eq("user_id", user_id)\
                    .eq("agent_name", agent_name)\
                    .execute()
            else:
                # Create new settings
                data["user_id"] = user_id
                data["agent_name"] = agent_name
                data["created_at"] = datetime.now().isoformat()
                self.client.table("user_agent_settings").insert(data).execute()
            
            return True
        except Exception as e:
            logger.error(f"Error when saving agent settings: {str(e)}")
            return False

    def get_user_agent_settings(self, user_id: str, agent_name: str = None):
        """
        Get agent settings for a specific user. If agent_name is not provided,
        get settings for all agents for the user.
        """
        try:
            query = self.client.table("user_agent_settings")\
                .select("*")\
                .eq("user_id", user_id)
            
            if agent_name:
                query = query.eq("agent_name", agent_name)
            
            response = query.execute()
            
            if agent_name and len(response.data) > 0:
                return json.loads(response.data[0]["settings"])
            
            result = {}
            for item in response.data:
                result[item["agent_name"]] = json.loads(item["settings"])
            
            return result
        except Exception as e:
            logger.error(f"Error when getting agent settings: {str(e)}")
            return {} if not agent_name else None

    # User Study Logs methods
    def save_user_study_log(self, user_id: str, session_id: str, log_type: str, log_data: dict, timestamp: str = None):
        """
        Save user study log to the database.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            log_type: Type of log (e.g., 'click', 'view', 'interaction')
            log_data: JSON payload with log details
            timestamp: Optional timestamp of when the action occurred (defaults to now)
        """
        try:
            if not timestamp:
                timestamp = datetime.now().isoformat()
                
            # Make a copy of log_data to avoid modifying the original
            log_data_copy = log_data.copy() if isinstance(log_data, dict) else log_data
            
            data = {
                "user_id": user_id,
                "session_id": session_id,
                "client_name": platform.node(),
                "timestamp": timestamp,
                "log_type": log_type,
                "log_data": json.dumps(log_data_copy) if isinstance(log_data_copy, dict) else log_data_copy,
            }
            
            response = self.client.table("user_study_logs").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error when saving user study log: {str(e)}")
            return False
            
    def get_user_study_logs(self, user_id: str = None, session_id: str = None, log_type: str = None, 
                           start_time: str = None, end_time: str = None, limit: int = 100):
        """
        Get user study logs with optional filtering.
        
        Args:
            user_id: Filter by user ID
            session_id: Filter by session ID
            log_type: Filter by log type
            start_time: Filter logs after this time (ISO format)
            end_time: Filter logs before this time (ISO format)
            limit: Maximum number of logs to return
        """
        try:
            query = self.client.table("user_study_logs").select("*")
            
            if user_id:
                query = query.eq("user_id", user_id)
            if session_id:
                query = query.eq("session_id", session_id)
            if log_type:
                query = query.eq("log_type", log_type)
            if start_time:
                query = query.gte("timestamp", start_time)
            if end_time:
                query = query.lte("timestamp", end_time)
                
            query = query.order("timestamp", desc=True).limit(limit)
            
            response = query.execute()
            
            # Parse the JSON data field
            result = []
            for log in response.data:
                if isinstance(log["log_data"], str):
                    try:
                        log["log_data"] = json.loads(log["log_data"])
                    except:
                        pass  # Keep as string if can't parse
                result.append(log)
                
            return result
        except Exception as e:
            logger.error(f"Error when getting user study logs: {str(e)}")
            return []

if __name__ == "__main__":
    rds_client = RDSClient()
    print(rds_client.get_all_user_email_newsletter_subscribed())

