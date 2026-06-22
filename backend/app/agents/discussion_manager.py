import uuid
from typing import Optional, List, Dict, Any
from fastapi.encoders import jsonable_encoder

from app.app_types.thread_types import DiscussionThread, MultiLevelSummary

class DiscussionThreadManager:
    """
    This class manages a discussion thread context.
    Each message adheres to the following structure:
      {
        "message": {
          "id": <message_id>,
          "author": <author>,
          "chosen_action": <action>,
          "reason": <reason>,
          "content": <message content>,
          "multi_level_summary": <multi-level summary>
        }
        "replies": [ ... nested messages ... ]
      }
    """

    def __init__(self, topic: str, topic_description: str):
        # Initialize with the discussion topic and an empty thread.
        self.thread_id = str(uuid.uuid4())
        self.topic = topic
        self.topic_description = topic_description
        self.thread: List[Dict[str, Any]] = []

    def _generate_id(self) -> str:
        # Generate a unique identifier for each message.
        return str(uuid.uuid4())

    def _find_message_and_parent(
        self, message_id: str, messages: List[Dict[str, Any]], parent: Optional[Dict[str, Any]] = None
    ) -> Optional[tuple]:
        """
        Recursively search for the message by ID.
        Returns a tuple of (message_node, parent_node) or None if not found.
        """
        for node in messages:
            message = node.get("message")
            if message and message.get("id") == message_id:
                return node, parent
            found = self._find_message_and_parent(message_id, node.get("replies", []), node)
            if found:
                return found
        return None

    def add_message(
        self, author: str, chosen_action: str, reason: str, content: str, reply_to: str = "-1", multi_level_summary: Optional[MultiLevelSummary] = None
    ) -> str:
        """
        Adds a new message to the discussion.
        If reply_to is "-1", it is added as a root message; otherwise, it is added as a reply.
        Returns the generated message ID.
        """
        message_id = self._generate_id()
        message_node = {
            "message": {
                "id": message_id,
                "author": author,
                "chosen_action": chosen_action,
                "reason": reason,
                "content": content,
                "multi_level_summary": multi_level_summary,
            },
            "replies": [],
        }
        if reply_to == "-1":
            self.thread.append(message_node)
        else:
            result = self._find_message_and_parent(reply_to, self.thread)
            if not result:
                raise ValueError(f"Parent message with ID {reply_to} not found.")
            parent_node, _ = result
            parent_node.setdefault("replies", []).append(message_node)
        return message_id

    def edit_message(
        self,
        message_id: str,
        new_chosen_action: Optional[str] = None,
        new_reason: Optional[str] = None,
        new_content: Optional[str] = None,
    ) -> bool:
        """
        Edits an existing message.
        Returns True if the message was found and updated, False otherwise.
        """
        result = self._find_message_and_parent(message_id, self.thread)
        if not result:
            return False
        message_node, _ = result
        if new_chosen_action is not None:
            message_node["message"]["chosen_action"] = new_chosen_action
        if new_reason is not None:
            message_node["message"]["reason"] = new_reason
        if new_content is not None:
            message_node["message"]["content"] = new_content
        return True

    def delete_message(self, message_id: str) -> bool:
        """
        Deletes a message by its ID.
        If the message is not found, returns False.
        """
        result = self._find_message_and_parent(message_id, self.thread)
        if not result:
            return False
        _, parent = result
        if parent is None:
            # Message is at the root level.
            self.thread = [msg for msg in self.thread if msg.get("id") != message_id]
        else:
            # Remove the message from its parent's replies.
            parent["replies"] = [
                msg for msg in parent.get("replies", []) if msg.get("message").get("id") != message_id
            ]
        return True

    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a message by its ID.
        Returns the message dict if found, otherwise None.
        """
        result = self._find_message_and_parent(message_id, self.thread)
        if not result:
            return None
        message_node, _ = result
        return message_node

    def get_thread(self) -> Dict[str, Any]:
        """
        Returns the entire discussion thread in a structured format.
        """
        return {
            "id": self.thread_id,
            "topic": self.topic,
            "topic_description": self.topic_description,
            "discussion_thread": self.thread,
        }
    
    def get_all_posts(self, thread: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        Traverses the thread and returns all posts (flattened) in the discussion thread.
        """
        if thread is None:
            thread = self.thread
        posts = []
        for post in thread:
            posts.append(post)
            posts.extend(self.get_all_posts(post.get("replies", [])))
        return posts
        

    def load_thread_from_json(self, json_data: str) -> None:
        """
        Loads a discussion thread from a JSON format string.
        Expects the JSON to be a dictionary with the keys: 'id', 'topic', and 'discussion_thread'.

        Raises:
            ValueError: If the JSON does not contain the required keys.
        """
        try:
            data = json.loads(json_data)
        except json.JSONDecodeError as e:
            raise ValueError("Invalid JSON format provided.") from e

        if not all(key in data for key in ("id", "topic", "topic_description", "discussion_thread")):
            raise ValueError("Invalid thread data; missing one of 'id', 'topic', 'topic_description', or 'discussion_thread'.")

        self.thread_id = data["id"]
        self.topic = data["topic"]
        self.topic_description = data["topic_description"]
        self.thread = data["discussion_thread"]

    def load_thread_from_pydantic(self, discussion_thread: DiscussionThread) -> None:
        self.thread_id = discussion_thread.discussion.id
        self.topic = discussion_thread.discussion.topic
        self.topic_description = discussion_thread.discussion.topic_description
        self.thread = jsonable_encoder(discussion_thread.discussion.discussion_thread)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.thread_id,
            "topic": self.topic,
            "topic_description": self.topic_description,
            "discussion_thread": self.thread,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DiscussionThreadManager":
        manager = cls(data["topic"], data["topic_description"])
        manager.thread_id = data["id"]
        manager.thread = data["discussion_thread"]
        return manager


    def print_thread_hierarchy(self, thread: List[Dict[str, Any]] | None = None) -> None:
        """
        Prints the thread ids in a hierarchical format.
        """
        if thread is None:
            thread = self.thread
        for post in thread:
            message = post.get("message")
            if message:
                print(message.get("id"))
            self.print_thread_hierarchy(post.get("replies", []))
    
    def print_thread_hierarchy_with_replies(self) -> None:
        self.print_thread_hierarchy(self.thread)

if __name__ == "__main__":
    manager = DiscussionThreadManager("How can AI improve human creativity?", "How can AI improve human creativity?")
    # Adding a root message
    msg1 = manager.add_message(
        author="John Doe",
        chosen_action="(Socratic) Probing Assumptions",
        reason="I want to delve deeper into the assumptions made about AI systems.",
        content="What assumptions are we making about human creativity?",
    )
    # Adding a reply to the above message
    msg2 = manager.add_message(
        author="Jane Doe",
        chosen_action="(Socratic) Probing Reasons & Evidence",
        reason="I'd like to understand the reasoning further.",
        content="Could you provide some evidence to back up these assumptions?",
        reply_to=msg1,
    )
    # Edit the reply
    manager.edit_message(msg2, new_content="Can you share evidence supporting your assumptions?")
    # Delete the root message (this will remove msg1 but msg2 remains only if reattached as needed; here it is fully removed)
    # manager.delete_message(msg1)
    
    import json
    print(json.dumps(manager.get_thread(), indent=2)) 