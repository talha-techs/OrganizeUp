const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Extract email safely
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          return done(new Error("No email associated with this Google account"), null);
        }

        // Check if user exists with same email
        user = await User.findOne({ email });

        if (user) {
          user.googleId = profile.id;
          user.avatar = user.avatar || profile.photos?.[0]?.value || "";
          await user.save();
          return done(null, user);
        }

        // Fallback for displayName to avoid validation errors
        const displayName =
          profile.displayName ||
          (profile.name
            ? `${profile.name.givenName || ""} ${profile.name.familyName || ""}`.trim()
            : "") ||
          email.split("@")[0] ||
          "User";

        const isAdmin =
          process.env.ADMIN_EMAIL &&
          email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

        // Create new user
        user = await User.create({
          name: displayName,
          email: email,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value || "",
          role: isAdmin ? "admin" : "user",
          isVerified: true,
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    },
  ),
);

module.exports = passport;
