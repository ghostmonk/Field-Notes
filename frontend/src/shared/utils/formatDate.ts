export const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    // Use UTC to ensure consistent rendering between server and client
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    });
};
