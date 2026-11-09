import { InferenceClient } from "@huggingface/inference";
import { prisma } from "@/lib/prisma";
import { contentModelMap } from "./contentModelMap";

const client = new InferenceClient(process.env.HF_TOKEN);

type AIContentAnalysis = {
    aiScore: number;
    aiLabel: string;
    aiReason: string;
}

/**
 * Analyze content using unitary/toxic-bert model from HuggingFace
 * It sends text to the model, extracts label with the highest score and converts the confidence score
 * into percentage
 * @param {*} text 
 * @returns 
 */
export async function analyzeContent(text:string): Promise<AIContentAnalysis> {
    const response = await client.textClassification({
        model: "unitary/multilingual-toxic-xlm-roberta",
        inputs: text,
        provider: "hf-inference"
    })

    // Get the highest score
    let highestScore = response[0];
    for (const item of response) {
        if (item.score > highestScore.score) {
            highestScore = item;
        }
    }

    const aiScore = Math.round(highestScore.score * 100);

    let aiLabel: string;
    let aiReason: string;

    // If score is less than 30, label it as "SAFE"
    if (aiScore < 30) {
        aiLabel = "SAFE";
        aiReason = `Content is safe (Highest toxicity score of: ${aiScore}%).`;
    } else if (aiScore < 80) {
        aiLabel = "TOXIC";
        aiReason = `AI detected ${aiLabel} content with confidence score of ${aiScore}%.`;
    } else {
        aiLabel = "SEVERE";
        aiReason = `AI detected ${aiLabel} content with confidence score of ${aiScore}%.`;
    }

    return {aiScore, aiLabel, aiReason};
}

export async function moderateContent(contentType: keyof typeof contentModelMap, contentId: number, contentBody: string) {
    try {
        const { aiScore, aiLabel, aiReason } = await analyzeContent(contentBody);

        await prisma.contentVerdict.upsert({
            where: {
                contentType_contentId: {
                    contentType,
                    contentId
                }
            },
            update: {
                aiLabel,
                aiScore,
                aiReason
            },
            create: {
                contentId: contentId,
                contentType: contentType,
                aiLabel: aiLabel,
                aiScore: aiScore,
                aiReason: aiReason
            }
        });

        // Get system user id
        const systemUser = await prisma.user.findUnique({
            where: { email: "system@ai.com"}
        });

        if (!systemUser) {
            throw new Error("System user not found");
        }

        const model = contentModelMap[contentType] as any;

        const content = await model.findUnique({
            where: {
                id: contentId
            },
            select: { authorId: true }
        });

        const reportedId = content?.authorId;


        // If score is greater than thresholed (80), create a report for this content
        if (aiScore > 80) {
            await prisma.report.create({
                data: {
                    reporterId: systemUser.id,
                    reportedId: reportedId,
                    explanation: "Flagged by AI: Exceeds toxicity threshold",
                    contentType: contentType,
                    contentId: contentId,
                    contentBody: contentBody
                }
            });
        }
    } catch (error) {
        console.error("AI Moderation error: ", error);
        throw error;
    }
}
