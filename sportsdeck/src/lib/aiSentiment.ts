import { InferenceClient } from "@huggingface/inference";
import { prisma } from "@/lib/prisma";

const client = new InferenceClient(process.env.HF_TOKEN);

type Reply = {
    sentimentLabel: string | null;
    author: { favoriteTeamId: number | null };
};

type AISentimentAnalysis = {
    sentimentLabel: string;
    sentimentScore: number;
}

type AISentimentOverview = {
    sentimentLabel: string;
    positiveCount: number; 
    negativeCount: number;
    neutralCount: number;
}

export async function analyzeSentiment(text: string): Promise<AISentimentAnalysis> {
    const response = await client.textClassification({
        model: "cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual",
        inputs: text,
        provider: "hf-inference"
    })
    
    let sentimentLabel: string;
    let sentimentScore: number;

    let highestScore = response[0];
    for (let item of response) {
        if (item.score > highestScore.score) {
            highestScore = item;
        }
    }

    sentimentLabel = highestScore.label.toUpperCase();
    sentimentScore = Math.round(highestScore.score * 100);

    return { sentimentLabel, sentimentScore};
}

export async function updateReplySentiment (contentId: number, contentBody: string) {
    try {
        const { sentimentLabel, sentimentScore } = await analyzeSentiment(contentBody);

        await prisma.reply.update({
            where: {id: contentId},
            data: {
                sentimentLabel: sentimentLabel,
                sentimentScore: sentimentScore
            }
        });
    } catch (error) {
        console.error("Reply sentiment analysis error: ", error);
        throw error;
    }
}

export function aggregateSentiment(replies: Reply[]): AISentimentOverview {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (let reply of replies) {
        if (!reply.sentimentLabel) continue;

        const label = reply.sentimentLabel.toLowerCase();

        // Overall sentiment
        if (label === "positive") {
            positiveCount++;
        } else if (label === "negative") {
            negativeCount++;
        } else {
            neutralCount++;
        }
    }

    const sentimentLabel = getOverallSentiment(positiveCount, negativeCount, neutralCount);

    return { sentimentLabel, positiveCount, negativeCount, neutralCount };
}


export function getOverallSentiment(positiveCount: number, negativeCount: number, neutralCount: number): string {
    let overallSentiment = "NEUTRAL";

    if (positiveCount >= negativeCount && positiveCount >= neutralCount) {
        overallSentiment = "POSITIVE";
    } else if (negativeCount >= positiveCount && negativeCount >= neutralCount) {
        overallSentiment = "NEGATIVE";
    }

    return overallSentiment;
}


