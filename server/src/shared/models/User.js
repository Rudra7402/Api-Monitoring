//we will use validator library for validate the email, password abhi implement nhi kra h
// ye hm user register krnte time krenge jese codearena me kra h


import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        minlength: 3
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["super_admin", "client_admin", "client_viewer"],
        default: "client_viewer"
    },

    // User kis company ka h
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: function () {
            return this.role !== "super_admin"
        }
    },

    isActive: {
        type: Boolean,
        default: true
    },

    permissions: {
        canCreateApiKeys: {
            type: Boolean,
            default: false,
        },
        canManageUsers: {
            type: Boolean,
            default: false,
        },
        canViewAnalytics: {
            type: Boolean,
            default: true,
        },
        canExportData: {
            type: Boolean,
            default: false,
        },
    },

}, {
    timestamps: true,
    collection: "users"
});

const User = mongoose.model("User", userSchema);
export default User;