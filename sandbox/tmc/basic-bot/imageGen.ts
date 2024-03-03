import { OpenAI } from "openai";
import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
});


export async function generateImage(prompt: string) {

    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `pixel art of ${prompt}. Empty blank background`,
        size: "1024x1024",
        n: 1,
    });

    const image_url = response.data[0].url;
    console.log("Dalle image: " + image_url);

    const output = await replicate.run(
        "stphtan94117/easy-remove-background:e91dc6be6a0d4b0df921fb86b5cc6023e958db8919558711d0d04318a31a5af2",
        {
            input: {
                "file": image_url
            }
        }
    );
    console.log("Background removal image " + output);
    return output;
}


generateImage("cat").then(console.log).catch(console.error);