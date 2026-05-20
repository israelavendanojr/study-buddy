import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_waitlist_emails() -> list[str]:
    response = supabase.table("waitlist").select("email").execute()
    return [row["email"] for row in response.data]


if __name__ == "__main__":
    emails = get_waitlist_emails()
    print(f"Found {len(emails)} emails:")
    for email in emails:
        print(f"  {email}")
