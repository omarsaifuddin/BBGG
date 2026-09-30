import atexit
import os
import shutil
import sys
import tempfile

# Settings are read when `app` is first imported, so pin the environment here:
# a throwaway database, and no real Proxmox, Caddy or Stripe even if a
# developer's .env points at them.
_tmp_dir = tempfile.mkdtemp(prefix="cloudcontrol-tests-")
atexit.register(shutil.rmtree, _tmp_dir, ignore_errors=True)

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(_tmp_dir, 'test.db')}"
os.environ["MOCK_PROXMOX"] = "true"
os.environ["CADDY_ADMIN_API_URL"] = "http://127.0.0.1:9"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_placeholder"
os.environ["BILLING_SIMULATOR_ENABLED"] = "false"

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
