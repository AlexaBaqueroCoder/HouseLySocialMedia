// Configuración para Google Sheets API
const SHEETS_CONFIG = {
  // Reemplaza con tu ID de Google Sheet
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',
  
  // Nombres de las hojas
  SHEETS: {
    PROPERTIES: 'Propiedades',
    AVAILABILITY: 'Disponibilidad', 
    RESERVATIONS: 'Reservas'
  },
  
  // Rangos de datos
  RANGES: {
    PROPERTIES: 'Propiedades!A:F',
    AVAILABILITY: 'Disponibilidad!A:D',
    RESERVATIONS: 'Reservas!A:G'
  }
};

// Estructura de datos para Google Sheets
const SHEETS_STRUCTURE = {
  // Hoja Propiedades: ID | Nombre | Ciudad | Precio | Capacidad | Estado
  PROPERTIES_HEADERS: ['ID', 'Nombre', 'Ciudad', 'Precio', 'Capacidad', 'Estado'],
  
  // Hoja Disponibilidad: Propiedad_ID | Fecha | Estado | Precio_Especial
  AVAILABILITY_HEADERS: ['Propiedad_ID', 'Fecha', 'Estado', 'Precio_Especial'],
  
  // Hoja Reservas: ID | Propiedad_ID | Huésped | Email | Check-in | Check-out | Estado
  RESERVATIONS_HEADERS: ['ID', 'Propiedad_ID', 'Huésped', 'Email', 'Check-in', 'Check-out', 'Estado']
};

// Estados de disponibilidad
const AVAILABILITY_STATUS = {
  AVAILABLE: 'Disponible',
  BOOKED: 'Reservado',
  BLOCKED: 'Bloqueado',
  MAINTENANCE: 'Mantenimiento'
};

// Función para inicializar Google Sheets API
async function initializeSheetsAPI() {
  try {
    // Cargar la API de Google Sheets
    await loadGoogleSheetsAPI();
    console.log('Google Sheets API cargada correctamente');
    return true;
  } catch (error) {
    console.error('Error cargando Google Sheets API:', error);
    return false;
  }
}

// Función para cargar la API de Google Sheets
function loadGoogleSheetsAPI() {
  return new Promise((resolve, reject) => {
    if (typeof gapi !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', () => {
        gapi.client.init({
          apiKey: 'TU_API_KEY_AQUI',
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        }).then(() => {
          resolve();
        }).catch(reject);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Función para obtener datos de propiedades desde Google Sheets
async function getPropertiesFromSheets() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: SHEETS_CONFIG.RANGES.PROPERTIES
    });
    
    const rows = response.result.values;
    if (!rows || rows.length <= 1) return [];
    
    // Convertir a objetos
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const property = {};
      headers.forEach((header, index) => {
        property[header.toLowerCase()] = row[index] || '';
      });
      return property;
    });
  } catch (error) {
    console.error('Error obteniendo propiedades:', error);
    return [];
  }
}

// Función para obtener disponibilidad desde Google Sheets
async function getAvailabilityFromSheets() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: SHEETS_CONFIG.RANGES.AVAILABILITY
    });
    
    const rows = response.result.values;
    if (!rows || rows.length <= 1) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const availability = {};
      headers.forEach((header, index) => {
        availability[header.toLowerCase()] = row[index] || '';
      });
      return availability;
    });
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    return [];
  }
}

// Función para obtener reservas desde Google Sheets
async function getReservationsFromSheets() {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: SHEETS_CONFIG.RANGES.RESERVATIONS
    });
    
    const rows = response.result.values;
    if (!rows || rows.length <= 1) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const reservation = {};
      headers.forEach((header, index) => {
        reservation[header.toLowerCase()] = row[index] || '';
      });
      return reservation;
    });
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    return [];
  }
}

// Función para crear una nueva reserva en Google Sheets
async function createReservationInSheets(reservationData) {
  try {
    const values = [
      [
        reservationData.id,
        reservationData.propertyId,
        reservationData.guestName,
        reservationData.email,
        reservationData.checkin,
        reservationData.checkout,
        reservationData.status
      ]
    ];
    
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: SHEETS_CONFIG.RANGES.RESERVATIONS,
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    });
    
    console.log('Reserva creada en Google Sheets:', reservationData);
    return true;
  } catch (error) {
    console.error('Error creando reserva:', error);
    return false;
  }
}

// Función para actualizar disponibilidad en Google Sheets
async function updateAvailabilityInSheets(propertyId, date, status, specialPrice = '') {
  try {
    const values = [
      [propertyId, date, status, specialPrice]
    ];
    
    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_CONFIG.SPREADSHEET_ID,
      range: SHEETS_CONFIG.RANGES.AVAILABILITY,
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    });
    
    console.log('Disponibilidad actualizada en Google Sheets');
    return true;
  } catch (error) {
    console.error('Error actualizando disponibilidad:', error);
    return false;
  }
}

// Exportar configuración
window.SHEETS_CONFIG = SHEETS_CONFIG;
window.SHEETS_STRUCTURE = SHEETS_STRUCTURE;
window.AVAILABILITY_STATUS = AVAILABILITY_STATUS;