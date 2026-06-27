import mongoose from "mongoose";

/**
 * Schema = structure of document
 * This schema stores API keys of clients/organizations
 */
const apiKeySchema = new mongoose.Schema(
    {
        // Unique ID for API key
        // Example: "key_123abc"
        keyId: {
            type: String,
            required: true,
            unique: true,
        },

        // Actual secret API key value
        // Example: "sk_xxxxxxxxx"
        keyValue: {
            type: String,
            required: true,
            unique: true,
        },

        // Which client/organization owns this API key
        // Stores ObjectId of Client collection
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
        },

        // Friendly name for API key
        // Example: "Production Key"
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Optional description
        description: {
            type: String,
            default: "",
        },

        // Which environment this key is used for
        // Only these values are allowed
        environment: {
            type: String,
            enum: ["production", "staging", "development", "testing"],
            default: "production",
        },

        // If false => key cannot be used
        isActive: {
            type: Boolean,
            default: true,
        },

        /**
         * Permissions of this API key
         * What actions this key can perform
         */
        permissions: {
            // Can send monitoring data?
            canIngest: {
                type: Boolean,
                default: true,
            },

            // Can view analytics/dashboard?
            canReadAnalytics: {
                type: Boolean,
                default: true,
            },

            // Which services are allowed
            // Example: ["payment-service", "auth-service"]
            allowedServices: [String],
        },

        /**
         * Security settings
         */
        security: {
            // Allowed IP addresses
            // Example: ["192.168.1.1"]
            allowedIPs: [String],

            // Allowed frontend origins
            // Example: ["https://myapp.com"]
            allowedOrigins: [String],

            // Last time key was rotated/changed
            lastRotated: {
                type: Date,
                default: Date.now,
            },
        },

        // Expiry date of API key
        expiresAt: {
            type: Date,

            // By default key expires after 365 days
            default: () => {
                const days = 365;

                return new Date(
                    Date.now() + days * 24 * 60 * 60 * 1000
                );
            },
        },

        /**
         * Extra information
         */
        metadata: {
            // Why this key was created
            purpose: {
                type: String,
                trim: true,
                maxlength: 200,
            },

            // Extra labels
            // Example: ["backend", "important"]
            tags: [String],
        },

        // User who created this API key
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },

    // Automatically adds:
    // createdAt and updatedAt
    {
        timestamps: true,
    }
);

/**
 * Method to check
 * whether API key is expired or not
 */
apiKeySchema.methods.isExpired = function () {
    // If no expiry date exists
    if (!this.expiresAt) {
        return false;
    }

    // Compare expiry date with current date
    return this.expiresAt < new Date();
};

/**
 * Create model from schema
 */
const ApiKey = mongoose.model("ApiKey", apiKeySchema);

export default ApiKey;