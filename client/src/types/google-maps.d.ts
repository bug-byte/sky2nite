// Basic type declarations for Google Maps Places API
// This allows the app to use Google Maps without the full type package

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[] }
          ) => GoogleAutocomplete;
        };
      };
    };
  }
}

interface GoogleAutocomplete {
  addListener(event: string, handler: () => void): void;
  getPlace(): {
    formatted_address?: string;
    geometry?: {
      location?: {
        lat(): number;
        lng(): number;
      };
    };
  };
}

export {};
