import mongoose, { Schema, Document } from "mongoose";

export interface IGoodie extends Document {
    name: string;
    imageUrl: string;
    coins_required: number;
    code: string;
}

const GoodieSchema: Schema<IGoodie> = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        imageUrl: {
            type: String,
            required: true,
        },

        coins_required: {
            type: Number,
            required: true,
        },

        code: {
            type: String,
            required: true,
            minlength: 6,
            maxlength: 6,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

const GoodieModel =
    mongoose.models.Goodie || mongoose.model<IGoodie>("Goodie", GoodieSchema);

export default GoodieModel;