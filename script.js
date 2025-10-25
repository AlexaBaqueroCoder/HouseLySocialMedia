let allProperties = [];
let allReservations = [];

// Cargar propiedades y reservas al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Intentar cargar desde Google Sheets primero
    if (typeof SHEETS_CONFIG !== 'undefined' && SHEETS_CONFIG.SPREADSHEET_ID !== 'TU_SPREADSHEET_ID_AQUI') {
      console.log('Intentando cargar desde Google Sheets...');
      await loadDataFromGoogleSheets();
    } else {
      console.log('Cargando desde archivos JSON locales...');
      await loadDataFromLocalFiles();
    }
    
    renderProperties(allProperties);
  } catch (error) {
    console.error('Error cargando datos:', error);
    showMessage('Error cargando los datos. Por favor recarga la página.', 'error');
  }
});

// Función para cargar datos desde Google Sheets
async function loadDataFromGoogleSheets() {
  try {
    // Inicializar Google Sheets API
    const sheetsReady = await initializeSheetsAPI();
    if (!sheetsReady) {
      throw new Error('No se pudo inicializar Google Sheets API');
    }
    
    // Cargar datos en paralelo
    const [properties, reservations, availability] = await Promise.all([
      getPropertiesFromSheets(),
      getReservationsFromSheets(),
      getAvailabilityFromSheets()
    ]);
    
    allProperties = properties;
    allReservations = reservations;
    
    console.log('✅ Datos cargados desde Google Sheets');
    console.log('Propiedades:', allProperties.length);
    console.log('Reservas:', allReservations.length);
    console.log('Disponibilidad:', availability.length);
    
  } catch (error) {
    console.error('Error cargando desde Google Sheets:', error);
    // Fallback a archivos locales
    await loadDataFromLocalFiles();
  }
}

// Función para cargar datos desde archivos locales (fallback)
async function loadDataFromLocalFiles() {
  const propertiesResponse = await fetch('Data/properties.json');
  allProperties = await propertiesResponse.json();
  
  const reservationsResponse = await fetch('Data/reservations.json');
  allReservations = await reservationsResponse.json();
  
  console.log('✅ Datos cargados desde archivos locales');
}

// Renderizar propiedades
function renderProperties(properties) {
  const container = document.getElementById('properties');
  if (properties.length === 0) {
    container.innerHTML = `<p class="no-results">No se encontraron propiedades que coincidan con tu búsqueda.</p>`;
    return;
  }

  container.innerHTML = properties.map(property => `
    <div class="property-card">
      <img src="${property.image}" alt="${property.title}">
      <div class="property-info">
        <h3>${property.title}</h3>
        <p>${property.city}</p>
        <p class="price">${property.price}</p>
        <p><strong>Capacidad:</strong> ${property.capacity} huéspedes</p>
        <p>${property.description}</p>
      </div>
    </div>
  `).join('');
}

// Filtrar propiedades al enviar el formulario
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const selectedCity = document.getElementById('city').value;
  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;
  const capacity = parseInt(document.getElementById('capacity').value);

  // Validaciones
  if (!selectedCity) {
    showMessage('Por favor selecciona una ciudad', 'error');
    return;
  }

  if (!checkin || !checkout) {
    showMessage('Por favor selecciona las fechas de entrada y salida', 'error');
    return;
  }

  if (new Date(checkin) >= new Date(checkout)) {
    showMessage('La fecha de salida debe ser posterior a la fecha de entrada', 'error');
    return;
  }

  if (!capacity || capacity < 1) {
    showMessage('Por favor ingresa un número válido de huéspedes', 'error');
    return;
  }

  // Mapeo de valores del select a nombres de ciudades en el JSON
  const cityMapping = {
    'cartagena': 'Cartagena',
    'medellin': 'Medellín',
    'bogota': 'Bogotá',
    'cali': 'Cali',
    'barranquilla': 'Barranquilla',
    'santa-marta': 'Santa Marta',
    'manizales': 'Manizales',
    'pereira': 'Pereira',
    'bucaramanga': 'Bucaramanga',
    'pasto': 'Pasto',
    'villavicencio': 'Villavicencio',
    'ibague': 'Ibagué',
    'armenia': 'Armenia',
    'valledupar': 'Valledupar'
  };

  const cityName = cityMapping[selectedCity];
  
  // Filtrado por todos los criterios
  let filtered = allProperties.filter(property => {
    // Filtro por ciudad
    const cityMatch = property.city === cityName;
    
    // Filtro por capacidad (la propiedad debe tener capacidad suficiente)
    const capacityMatch = property.capacity >= capacity;
    
    // Filtro por disponibilidad
    const availableMatch = property.available === true;
    
    // Filtro por fechas disponibles
    const datesAvailable = checkDateAvailability(property, checkin, checkout);
    
    return cityMatch && capacityMatch && availableMatch && datesAvailable;
  });

  // Mostrar resultados con información detallada
  if (filtered.length === 0) {
    const totalProperties = allProperties.filter(p => p.city === cityName).length;
    if (totalProperties === 0) {
      showMessage('No hay propiedades en la ciudad seleccionada', 'info');
    } else {
      // Contar propiedades con reservas en esas fechas
      const propertiesWithReservations = allProperties.filter(p => {
        if (p.city !== cityName) return false;
        const reservations = getPropertyReservations(p.id);
        return reservations.some(res => 
          datesOverlap(new Date(checkin), new Date(checkout), new Date(res.checkin), new Date(res.checkout))
        );
      }).length;
      
      showMessage(`No hay propiedades disponibles para las fechas seleccionadas. Hay ${totalProperties} propiedades en ${cityName}, pero ${propertiesWithReservations} tienen reservas en esas fechas.`, 'info');
    }
  } else {
    showMessage(`✅ Se encontraron ${filtered.length} propiedades disponibles para las fechas seleccionadas`, 'success');
  }

  renderProperties(filtered);
  
  // Mostrar información de reservas en consola para debugging
  console.log('=== INFORMACIÓN DE RESERVAS ===');
  console.log('Total de reservas:', allReservations.length);
  console.log('Reservas activas:', allReservations.filter(r => r.status === 'confirmed').length);
  console.log('Propiedades filtradas:', filtered.length);
  
  // Mostrar reservas por ciudad
  const cityReservations = allReservations.filter(r => {
    const property = allProperties.find(p => p.id === r.propertyId);
    return property && property.city === cityName;
  });
  console.log(`Reservas en ${cityName}:`, cityReservations.length);
});

// Función para verificar disponibilidad de fechas basada en reservas
function checkDateAvailability(property, checkin, checkout) {
  // Buscar reservas existentes para esta propiedad
  const propertyReservations = allReservations.filter(reservation => 
    reservation.propertyId === property.id && 
    reservation.status === 'confirmed'
  );

  // Si no hay reservas, está disponible
  if (propertyReservations.length === 0) {
    return true;
  }

  // Convertir fechas de búsqueda a objetos Date
  const searchCheckin = new Date(checkin);
  const searchCheckout = new Date(checkout);

  // Verificar conflictos con reservas existentes
  for (const reservation of propertyReservations) {
    const resCheckin = new Date(reservation.checkin);
    const resCheckout = new Date(reservation.checkout);

    // Verificar si hay solapamiento de fechas
    if (datesOverlap(searchCheckin, searchCheckout, resCheckin, resCheckout)) {
      return false; // Hay conflicto con una reserva existente
    }
  }

  return true; // No hay conflictos, está disponible
}

// Función auxiliar para verificar solapamiento de fechas
function datesOverlap(start1, end1, start2, end2) {
  // Dos rangos se solapan si:
  // - El inicio del primero es anterior al final del segundo, Y
  // - El final del primero es posterior al inicio del segundo
  return start1 < end2 && end1 > start2;
}

// Función para crear una nueva reserva
async function createReservation(propertyId, guestName, email, checkin, checkout, guests) {
  const newReservation = {
    id: `RES${String(allReservations.length + 1).padStart(3, '0')}`,
    propertyId: propertyId,
    guestName: guestName,
    email: email,
    checkin: checkin,
    checkout: checkout,
    guests: guests,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    totalPrice: calculateTotalPrice(propertyId, checkin, checkout)
  };

  // Agregar a la lista de reservas local
  allReservations.push(newReservation);
  
  // Intentar guardar en Google Sheets si está configurado
  if (typeof SHEETS_CONFIG !== 'undefined' && SHEETS_CONFIG.SPREADSHEET_ID !== 'TU_SPREADSHEET_ID_AQUI') {
    try {
      await createReservationInSheets(newReservation);
      console.log('✅ Reserva guardada en Google Sheets');
    } catch (error) {
      console.error('Error guardando en Google Sheets:', error);
    }
  }
  
  console.log('Nueva reserva creada:', newReservation);
  return newReservation;
}

// Función para calcular el precio total
function calculateTotalPrice(propertyId, checkin, checkout) {
  const property = allProperties.find(p => p.id === propertyId);
  if (!property) return 0;

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
  
  // Extraer precio numérico (remover "$" y "/ noche")
  const pricePerNight = parseInt(property.price.replace(/[$,.\s]/g, ''));
  
  return pricePerNight * nights;
}

// Función para obtener reservas de una propiedad
function getPropertyReservations(propertyId) {
  return allReservations.filter(reservation => 
    reservation.propertyId === propertyId && 
    reservation.status === 'confirmed'
  );
}

// Función para verificar si una propiedad está disponible en fechas específicas
function isPropertyAvailable(propertyId, checkin, checkout) {
  const property = allProperties.find(p => p.id === propertyId);
  if (!property) return false;

  return checkDateAvailability(property, checkin, checkout);
}

// Función para mostrar mensajes al usuario
function showMessage(message, type) {
  // Remover mensaje anterior si existe
  const existingMessage = document.querySelector('.search-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Crear nuevo mensaje
  const messageDiv = document.createElement('div');
  messageDiv.className = `search-message search-message-${type}`;
  messageDiv.textContent = message;
  
  // Insertar mensaje después del formulario
  const searchBox = document.querySelector('.search-box');
  searchBox.appendChild(messageDiv);
  
  // Remover mensaje después de 5 segundos
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}
