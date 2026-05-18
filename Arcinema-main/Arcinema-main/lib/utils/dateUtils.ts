/**
 * Format a date string to a human-readable format
 * @param dateString - Date in format YYYY-MM-DD or Date object
 * @returns Formatted date like "March 15, 2024"
 */
export function formatReleaseDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }

    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    return dateString.toString();
  }
}

/**
 * Format a date string to short format
 * @param dateString - Date in format YYYY-MM-DD or Date object
 * @returns Formatted date like "Mar 15"
 */
export function formatShortDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }

    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    return dateString.toString();
  }
}
