// Carregar dados do localStorage ou usar dados simulados como fallback
let bookings = [];

// Função para carregar dados do localStorage
function loadBookingsFromStorage() {
    const storedBookings = localStorage.getItem('management_bookings');
    if (storedBookings) {
        bookings = JSON.parse(storedBookings);
    } 
}

let currentEditId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadBookingsFromStorage();
    loadDashboardStats();
    loadBookingsTable();
    setupEventListeners();
    
    // Verificar novos agendamentos a cada 30 segundos
    setInterval(checkNewBookings, 30000);
    
    // Verificar se há novos agendamentos pendentes
    checkNewBookings();
    
    // Listener para redimensionamento da janela
    window.addEventListener('resize', function() {
        // Recarregar a tabela quando a janela for redimensionada
        loadBookingsTable();
    });
});

// Função para verificar novos agendamentos
function checkNewBookings() {
    const storedBookings = localStorage.getItem('management_bookings');
    if (storedBookings) {
        const currentBookings = JSON.parse(storedBookings);
        const pendingBookings = currentBookings.filter(booking => booking.status === 'pendente');
        
        // Atualizar badge de notificação
        const notificationBadge = document.getElementById('notificationBadge');
        const pendingCount = document.getElementById('pendingCount');
        
        if (pendingBookings.length > 0) {
            notificationBadge.style.display = 'flex';
            pendingCount.textContent = pendingBookings.length;
            
            const newPendingCount = pendingBookings.filter(booking => {
                const bookingDate = new Date(booking.createdAt);
                const now = new Date();
                const diffInMinutes = (now - bookingDate) / (1000 * 60);
                return diffInMinutes < 5; // Agendamentos criados nos últimos 5 minutos
            }).length;
            
            if (newPendingCount > 0) {
                showMessage(`Você tem ${newPendingCount} novo(s) agendamento(s) pendente(s)!`, 'success');
            }
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Busca
    document.getElementById('searchInput').addEventListener('input', filterBookings);
    
    // Filtros
    document.getElementById('statusFilter').addEventListener('change', filterBookings);
    document.getElementById('dateFilter').addEventListener('change', filterBookings);
    
    // Formulário do modal
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('bookingModal');
        const confirmModal = document.getElementById('confirmModal');
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

// Carregar estatísticas do dashboard
function loadDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(booking => booking.date === today);
    const upcomingBookings = bookings.filter(booking => 
        booking.date >= today && booking.status !== 'cancelado'
    );
    const uniqueClients = new Set(bookings.map(booking => booking.phone)).size;
    const monthlyRevenue = bookings
        .filter(booking => booking.status === 'concluido')
        .reduce((total, booking) => {
            const value = parseFloat(booking.value.replace('R$ ', '').replace(',', '.'));
            return total + value;
        }, 0);

    document.getElementById('todayBookings').textContent = todayBookings.length;
    document.getElementById('upcomingBookings').textContent = upcomingBookings.length;
    document.getElementById('totalClients').textContent = uniqueClients;
    document.getElementById('monthlyRevenue').textContent = `R$ ${monthlyRevenue.toFixed(2)}`;
}

// Carregar tabela de agendamentos
function loadBookingsTable(filteredBookings = null) {
    const tableBody = document.getElementById('bookingsTableBody');
    const data = filteredBookings || bookings;
    
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-light);">
                    Nenhum agendamento encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    // Verificar se é mobile
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Renderizar como cards para mobile
        renderMobileCards(data, tableBody);
    } else {
        // Renderizar como tabela para desktop
        renderDesktopTable(data, tableBody);
    }
}

// Renderizar cards para mobile
function renderMobileCards(data, container) {
    container.innerHTML = '';
    
    data.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="client-info">
                    <h4>${booking.name}</h4>
                    <p class="phone">${booking.phone}</p>
                </div>
                <span class="status-badge status-${booking.status}">${getStatusText(booking.status)}</span>
            </div>
            <div class="card-body">
                <div class="booking-details">
                    <div class="detail-item">
                        <i class="fas fa-cut"></i>
                        <span>${booking.service}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(booking.date)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>${booking.time}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${booking.value}</span>
                    </div>
                    ${booking.notes ? `
                    <div class="detail-item">
                        <i class="fas fa-comment"></i>
                        <span>${booking.notes}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="editBooking(${booking.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                    <span>Editar</span>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteBooking(${booking.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                    <span>Excluir</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Renderizar tabela para desktop
function renderDesktopTable(data, tableBody) {
    tableBody.innerHTML = '';
    
    data.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.name}</td>
            <td>${booking.phone}</td>
            <td>${booking.service}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td><span class="status-badge status-${booking.status}">${getStatusText(booking.status)}</span></td>
            <td>${booking.value}</td>
            <td class="action-buttons-cell">
                <button class="btn-icon btn-edit" onclick="editBooking(${booking.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteBooking(${booking.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Filtrar agendamentos
function filterBookings() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    let filtered = bookings.filter(booking => {
        // Busca por texto
        const matchesSearch = 
            booking.name.toLowerCase().includes(searchTerm) ||
            booking.phone.includes(searchTerm) ||
            booking.service.toLowerCase().includes(searchTerm);
        
        // Filtro por status
        const matchesStatus = !statusFilter || booking.status === statusFilter;
        
        // Filtro por data
        let matchesDate = true;
        if (dateFilter) {
            const today = new Date();
            const bookingDate = new Date(booking.date);
            
            switch (dateFilter) {
                case 'today':
                    matchesDate = booking.date === today.toISOString().split('T')[0];
                    break;
                case 'tomorrow':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    matchesDate = booking.date === tomorrow.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekFromNow = new Date(today);
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    matchesDate = bookingDate >= today && bookingDate <= weekFromNow;
                    break;
                case 'month':
                    const monthFromNow = new Date(today);
                    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
                    matchesDate = bookingDate >= today && bookingDate <= monthFromNow;
                    break;
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    loadBookingsTable(filtered);
}

// Função para salvar dados no localStorage
function saveBookingsToStorage() {
    localStorage.setItem('management_bookings', JSON.stringify(bookings));
}

// Função para adicionar novo agendamento (mantida para compatibilidade, mas não será usada)
function addNewBooking() {
    showMessage('Novos agendamentos devem ser feitos através do site principal.', 'error');
}

// Editar agendamento
function editBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Editar Agendamento';
    
    // Preencher formulário
    document.getElementById('modalName').value = booking.name;
    document.getElementById('modalPhone').value = booking.phone;
    // Preencher o select com nome|valor
    document.getElementById('modalService').value = `${booking.service}|${booking.value}`;
    document.getElementById('modalStatus').value = booking.status;
    document.getElementById('modalDate').value = booking.date;
    document.getElementById('modalTime').value = booking.time;
    document.getElementById('modalNotes').value = booking.notes || '';
    
    openModal();
}

// Excluir agendamento
function deleteBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    showConfirmModal(
        `Tem certeza que deseja excluir o agendamento de ${booking.name}?`,
        () => {
            // Remover do array local
            bookings = bookings.filter(b => b.id !== id);
            saveBookingsToStorage();
            
            // Remover também do localStorage principal para liberar o horário
            const mainBookings = JSON.parse(localStorage.getItem('barbearia_bookings') || '[]');
            const updatedMainBookings = mainBookings.filter(b => 
                !(b.name === booking.name && 
                  b.phone === booking.phone && 
                  b.date === booking.date && 
                  b.time === booking.time)
            );
            localStorage.setItem('barbearia_bookings', JSON.stringify(updatedMainBookings));
            
            loadBookingsTable();
            loadDashboardStats();
            showMessage('Agendamento excluído com sucesso!', 'success');
        }
    );
}

// Manipular envio do formulário
function handleBookingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    // Separar nome do serviço e valor
    const [serviceName, serviceValue] = formData.get('service').split('|');
    const bookingData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        service: serviceName ? serviceName.trim() : '',
        value: serviceValue ? serviceValue.trim() : '',
        status: formData.get('status'),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes')
    };
    
    if (currentEditId) {
        // Editar agendamento existente
        const index = bookings.findIndex(b => b.id === currentEditId);
        if (index !== -1) {
            const oldBooking = bookings[index];
            bookings[index] = {
                ...bookings[index],
                ...bookingData
            };
            saveBookingsToStorage();
            // Sincronizar com o localStorage principal
            const mainBookings = JSON.parse(localStorage.getItem('barbearia_bookings') || '[]');
            // Remover o agendamento antigo
            const updatedMainBookings = mainBookings.filter(b => 
                !(b.name === oldBooking.name && 
                  b.phone === oldBooking.phone && 
                  b.date === oldBooking.date && 
                  b.time === oldBooking.time)
            );
            // Adicionar o agendamento atualizado
            const updatedBooking = {
                name: bookingData.name,
                phone: bookingData.phone,
                service: bookingData.service,
                value: bookingData.value,
                date: bookingData.date,
                time: bookingData.time,
                status: bookingData.status,
                notes: bookingData.notes,
                createdAt: oldBooking.createdAt || new Date().toISOString()
            };
            updatedMainBookings.push(updatedBooking);
            localStorage.setItem('barbearia_bookings', JSON.stringify(updatedMainBookings));
            showMessage('Agendamento atualizado com sucesso!', 'success');
        }
    } else {
        // Não permitir adicionar novos agendamentos via gerenciamento
        showMessage('Novos agendamentos devem ser feitos através do site principal.', 'error');
        return;
    }
    closeModal();
    loadBookingsTable();
    loadDashboardStats();
}

// Abrir modal
function openModal() {
    document.getElementById('bookingModal').style.display = 'block';
}

// Fechar modal
function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    currentEditId = null;
}

// Mostrar modal de confirmação
function showConfirmModal(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmActionBtn').onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
    document.getElementById('confirmModal').style.display = 'block';
}

// Fechar modal de confirmação
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Atualizar tabela
function refreshTable() {
    loadBookingsFromStorage(); // Recarregar dados do localStorage
    loadBookingsTable();
    loadDashboardStats();
    showMessage('Dados atualizados!', 'success');
}

// Exportar dados
function exportData() {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agendamentos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('Dados exportados com sucesso!', 'success');
}

// Gerar CSV
function generateCSV() {
    const headers = ['Nome', 'Telefone', 'Serviço', 'Data', 'Horário', 'Status', 'Valor', 'Observações'];
    const rows = bookings.map(booking => [
        booking.name,
        booking.phone,
        booking.service,
        formatDate(booking.date),
        booking.time,
        getStatusText(booking.status),
        booking.value,
        booking.notes || ''
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
}

// Logout
function logout() {
    showConfirmModal('Tem certeza que deseja sair?', () => {
        window.location.href = 'login.html';
    });
}

// Funções auxiliares
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'confirmado': 'Confirmado',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

function showMessage(message, type) {
    // Remover mensagens existentes
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Criar elemento de mensagem
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    // Estilizar a mensagem
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    if (type === 'success') {
        messageEl.style.background = 'linear-gradient(135deg, #D4AF37, #B8860B)';
    } else {
        messageEl.style.background = 'linear-gradient(135deg, #dc3545, #e74c3c)';
    }

    document.body.appendChild(messageEl);

    // Remover mensagem após 3 segundos
    setTimeout(() => {
        messageEl.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 300);
    }, 3000);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style); 