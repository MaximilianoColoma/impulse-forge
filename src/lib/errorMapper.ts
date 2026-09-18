export interface ErrorAction {
  text: string;
  action?: () => void;
}

export interface ErrorInfo {
  title: string;
  message: string;
  action?: ErrorAction;
}

export const getErrorInfo = (error: any): ErrorInfo => {
  const errorMap: Record<string, ErrorInfo> = {
    // Auth errors
    'auth/invalid-email': {
      title: 'Ungültige E-Mail-Adresse',
      message: 'Bitte überprüfen Sie die eingegebene E-Mail-Adresse und versuchen Sie es erneut.',
    },
    'auth/user-not-found': {
      title: 'Benutzer nicht gefunden',
      message: 'Es existiert kein Konto mit dieser E-Mail-Adresse. Möglicherweise haben Sie sich mit einer anderen E-Mail registriert.',
      action: {
        text: 'Konto erstellen',
        action: () => window.location.href = '/auth'
      }
    },
    'auth/wrong-password': {
      title: 'Falsches Passwort',
      message: 'Das eingegebene Passwort ist nicht korrekt. Überprüfen Sie Ihre Eingabe oder setzen Sie das Passwort zurück.',
      action: {
        text: 'Passwort zurücksetzen',
        action: () => window.location.href = '/reset-password'
      }
    },
    'auth/email-already-in-use': {
      title: 'E-Mail bereits verwendet',
      message: 'Diese E-Mail-Adresse wird bereits für ein Konto verwendet. Möchten Sie sich stattdessen anmelden?',
      action: {
        text: 'Anmelden',
        action: () => window.location.href = '/auth'
      }
    },
    'auth/weak-password': {
      title: 'Passwort zu schwach',
      message: 'Das Passwort ist zu schwach. Bitte wählen Sie ein Passwort mit mindestens 8 Zeichen, das Buchstaben, Zahlen und Sonderzeichen enthält.',
    },
    'auth/too-many-requests': {
      title: 'Zu viele Versuche',
      message: 'Zu viele Anmeldeversuche. Bitte warten Sie einige Minuten, bevor Sie es erneut versuchen.',
    },
    
    // Database errors
    'P0001': {
      title: 'Ungültige Eingabe',
      message: 'Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.',
    },
    'P0002': {
      title: 'Datenbankverbindung fehlgeschlagen',
      message: 'Bitte versuchen Sie es später erneut.',
    },
    '42501': {
      title: 'Keine Berechtigung',
      message: 'Sie haben keine Berechtigung für diese Aktion.',
    },
    '23505': {
      title: 'Eintrag bereits vorhanden',
      message: 'Dieser Eintrag existiert bereits. Bitte verwenden Sie einen anderen Wert.',
    },
    '23503': {
      title: 'Referenzfehler',
      message: 'Dieser Eintrag wird von anderen Daten referenziert und kann nicht gelöscht werden.',
    },
    'PGRST116': {
      title: 'Keine Daten gefunden',
      message: 'Die angeforderten Daten konnten nicht gefunden werden.',
    },
    'PGRST301': {
      title: 'Ungültige Anfrage',
      message: 'Die Anfrage konnte nicht verarbeitet werden.',
    },
    
    // Network errors
    'network-error': {
      title: 'Verbindungsproblem',
      message: 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      action: {
        text: 'Erneut versuchen',
        action: () => window.location.reload()
      }
    },
    'timeout': {
      title: 'Zeitüberschreitung',
      message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es später erneut.',
    },
    
    // Rate limiting
    'rate-limit-exceeded': {
      title: 'Zu viele Anfragen',
      message: 'Sie haben zu viele Anfragen gesendet. Bitte warten Sie einige Minuten, bevor Sie es erneut versuchen.',
    },
  };
  
  const defaultError: ErrorInfo = {
    title: 'Unerwarteter Fehler',
    message: error?.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    action: {
      text: 'Seite neu laden',
      action: () => window.location.reload()
    }
  };
  
  // Check for known error codes
  if (error?.code && errorMap[error.code]) {
    return errorMap[error.code];
  }
  
  // Check for known error messages
  if (error?.message) {
    for (const [code, errorInfo] of Object.entries(errorMap)) {
      if (error.message.includes(code)) {
        return errorInfo;
      }
    }
  }
  
  return defaultError;
};

// Legacy function for backward compatibility
export const getUserFriendlyError = (error: any): string => {
  const errorInfo = getErrorInfo(error);
  return `${errorInfo.title}: ${errorInfo.message}`;
};
