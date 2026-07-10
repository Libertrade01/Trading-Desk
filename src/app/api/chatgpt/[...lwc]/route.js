import { chatgptAuth } from "@/lib/chatgpt-handler";

export const GET = (request) => chatgptAuth.handler(request);
export const POST = (request) => chatgptAuth.handler(request);
