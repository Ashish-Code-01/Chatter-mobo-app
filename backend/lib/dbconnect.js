import mongoose from "mongoose";

const connectDB = async () => {
    // Validate MongoDB URI is configured
    if (!process.env.MONGO_URI) {
        console.error('❌ Error: MONGO_URI environment variable is not set');
        console.error('Please configure MONGO_URI in your .env file');
        process.exit(1);
    }

    try {
        mongoose.connection.on("connected", () => {
            console.log("✅ Mongoose connected to DB");
        });

        mongoose.connection.on("error", (err) => {
            console.error("❌ MongoDB connection error:", err);
        });

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            retryWrites: true,
            w: 'majority'
        });
        return conn;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;