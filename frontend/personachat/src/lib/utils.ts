import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// Parse the concept string to extract entity mention and source texts
export const parseConceptString = (conceptStr: string) => {
  try {
    // Extract entity mention between parentheses
    const entityMatch = conceptStr.match(/\((.*?)\)/);
    const concept = entityMatch ? entityMatch[1] : "";

    // Extract source texts between double square brackets
    const sourceMatch = conceptStr.match(/\[\[(.*?)\]\]/);
    let sources: string[] = [];

    if (sourceMatch) {
      // Use a regex to split by commas that are not within quotes
      const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
      sources = sourceMatch[1]
        .split(regex)
        .map(text => text.trim().replace(/^["']|["']$/g, ''));
    }

    return { concept, sources };
  } catch (error) {
    console.error("Error parsing concept string:", error);
    return { concept: conceptStr, sources: [] };
  }
};