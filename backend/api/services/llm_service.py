from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from ..settings import settings


async def generate_meal_guidance(query: str, context: dict) -> str:
    groq_key = settings.groq_api_key or settings.api_key
    if not groq_key:
        return (
            "Groq API key is not configured. Set GROQ_API_KEY in backend/.env "
            "to enable LLM meal guidance."
        )

    chat = ChatGroq(
        api_key=groq_key,
        model=settings.groq_model,
        temperature=0.3,
    )

    system_prompt = (
        "You are a nutrition and budget coach. Return concise JSON-like bullet points with: "
        "meal ideas, estimated calories, estimated cost in INR, and why it fits the user profile. "
        "Use breakfast/lunch/dinner framing when relevant."
    )

    user_prompt = (
        f"User context: {context}. "
        f"Question: {query}. "
        "Respect calorie and budget constraints from context first."
    )

    response = await chat.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])
    return response.content if isinstance(response.content, str) else str(response.content)
