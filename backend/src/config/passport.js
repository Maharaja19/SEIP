const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || !profile.emails[0]?.value) {
          return done(null, false, { message: 'Email not provided by Google' });
        }

        const email = profile.emails[0].value.toLowerCase().trim();
        const profilePhoto = profile.photos?.[0]?.value || null;

        let user = await User.findOne({
          $or: [{ email }, { googleId: profile.id }],
        });

        if (!user) {
          const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
          const nextSNo = lastUser?.sNo ? lastUser.sNo + 1 : 1;

          user = new User({
            sNo: nextSNo,
            email,
            name: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            avatar: profilePhoto,
            profilePicture: profilePhoto,
            role: 'Member',
            onboardingCompleted: false,
          });
        } else {
          if (!user.googleId) user.googleId = profile.id;

          if (profilePhoto) {
            if (!user.avatar) user.avatar = profilePhoto;
            if (!user.profilePicture) user.profilePicture = profilePhoto;
          }

          if (!user.sNo) {
            const lastUser = await User.findOne({}, { sNo: 1 }).sort({ sNo: -1 });
            user.sNo = lastUser?.sNo ? lastUser.sNo + 1 : 1;
          }
        }

        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        if (error.code === 11000) {
          return done(null, false, {
            message: 'An account with this email or Google ID already exists',
          });
        }

        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
