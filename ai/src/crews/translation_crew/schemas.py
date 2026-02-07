from pydantic import BaseModel, Field


class ExampleSentence(BaseModel):
    """Example sentence with translation."""
    sentence: str = Field(description="Example sentence in target language")
    translation: str = Field(description="Translation of the example sentence")


class TranslationOutput(BaseModel):
    """Output schema for translation results."""
    word: str = Field(description="Original word being translated")
    source_language: str = Field(description="Source language")
    target_language: str = Field(description="Target language")
    primary_translation: str = Field(description="Primary translation of the word")
    alternative_translations: list[str] = Field(
        default_factory=list,
        description="Alternative translations if the word has multiple meanings"
    )
    examples: list[ExampleSentence] = Field(
        default_factory=list,
        description="Example sentences showing usage"
    )
    notes: str = Field(
        default="",
        description="Additional cultural or grammatical notes"
    )
