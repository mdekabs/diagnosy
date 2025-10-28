import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000;

const UserSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            validate: {
                validator: function (v) {
                    return /^[A-Za-z0-9_]+$/.test(v);
                },
                message: (props) =>
                    `${props.value} is not a valid username! Use only letters, numbers, and underscores.`,
            },
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
            validate: {
                validator: function (v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: (props) => `${props.value} is not a valid email address!`,
            },
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        loginAttempts: { 
            type: Number, 
            default: 0
        },
        lockUntil: { 
            type: Number
        },
    },
    { timestamps: true }
);


UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.virtual("isLocked").get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.incrementLoginAttempts = function () {
    if (this.isLocked) {
        if (Date.now() > this.lockUntil) {
            return this.updateOne({
                $set: { loginAttempts: 1 },
                $unset: { lockUntil: 1 },
            }).exec();
        }
        return this.updateOne({ $inc: { loginAttempts: 1 } }).exec();
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }
    return this.updateOne(updates).exec();
};

UserSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 },
    }).exec();
};

UserSchema.methods.canLogin = function () {
    return !this.isLocked;
};

const User = mongoose.model("User", UserSchema);

export default User;
