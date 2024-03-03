import { OpenAI } from "openai";
import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string) {
    const openai = new OpenAI();

    const response = await openai.createImage({
        model: "dall-e-3",
        prompt: `pixel art of ${prompt}. Empty blank background`,
        size: "1024x1024",
        n: 1,
    });

    const image_url = response.data.data[0].url;

    const output = await replicate.run(
        "stphtan94117/easy-remove-background:e91dc6be6a0d4b0df921fb86b5cc6023e958db8919558711d0d04318a31a5af2",
        {
            input: {
                "file": image_url
            }
        }
    );
    return output;
}
