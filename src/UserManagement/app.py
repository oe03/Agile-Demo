from flask import Flask

from firebase_config import init_firebase
from register import register_bp
from login import login_bp
from profile import profile_bp

app = Flask(__name__)

# Used to sign the session cookie. Replace with a proper secret
# (e.g. from an environment variable) before going to production.
app.secret_key = "dev-secret-key-change-me"

# Attempt to connect to Firebase on startup (safe to fail silently
# while the placeholder key is still in place).
init_firebase()

# Register each user story's routes
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(profile_bp)


@app.route("/")
def home():
    from flask import redirect, url_for
    return redirect(url_for("login.login"))


if __name__ == "__main__":
    app.run(debug=True)
