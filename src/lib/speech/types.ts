import type { Token } from "@/lib/phonemes";

export type ErrorType = "None" | "Mispronunciation" | "Omission" | "Insertion";

export type PhonemeResult = {
  /** canonical phoneme key (see lib/phonemes) */
  phoneme: string;
  score: number;
  /** what the recognizer most likely heard instead, when it differs */
  heardAs?: string;
};

export type WordResult = {
  /** display text: the reference word when scripted, recognized word otherwise */
  word: string;
  norm: string;
  glue?: boolean;
  /** 0-100; null for omitted words */
  score: number | null;
  error: ErrorType;
  offsetMs?: number;
  durationMs?: number;
  phonemes: PhonemeResult[];
  unexpectedBreak?: boolean;
  missingBreak?: boolean;
  monotone?: boolean;
};

export type Scores = {
  pron: number;
  accuracy: number;
  fluency: number;
  /** null in conversation mode (no reference text) */
  completeness: number | null;
  prosody: number | null;
};

export type Assessment = Scores & {
  scripted: boolean;
  words: WordResult[];
  transcript: string;
  demo: boolean;
};

/** A dictionary lookup for one word of a sentence (from /api/ipa). */
export type IpaWord = Token & {
  ipa: string | null;
  phonemes: string[];
};

// Shape of Azure's detailed JSON result (only the fields we read).
export type AzPhoneme = {
  Phoneme: string;
  Offset?: number;
  Duration?: number;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    NBestPhonemes?: { Phoneme: string; Score: number }[];
  };
};

export type AzWord = {
  Word: string;
  Offset?: number;
  Duration?: number;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string;
    Feedback?: {
      Prosody?: {
        Break?: { ErrorTypes?: string[] };
        Intonation?: { ErrorTypes?: string[] };
      };
    };
  };
  Phonemes?: AzPhoneme[];
};

export type AzSegment = {
  DisplayText?: string;
  Offset?: number;
  Duration?: number;
  NBest?: {
    Display?: string;
    Lexical?: string;
    PronunciationAssessment?: {
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      PronScore?: number;
      ProsodyScore?: number;
    };
    Words?: AzWord[];
  }[];
};
