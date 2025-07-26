document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let allData = [];
    let filteredData = [];
    let chart = null;
    
    // DOM elements
    const tableBody = document.getElementById('tableBody');
    const companyFilter = document.getElementById('companyFilter');
    const patternFilter = document.getElementById('patternFilter');
    const timeframeFilter = document.getElementById('timeframeFilter');
    const chartCanvas = document.getElementById('candlestickChart');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    loadingSpinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    document.querySelector('.container-fluid').prepend(loadingSpinner);
    
    // Show/hide loading spinner
    function showLoading() { loadingSpinner.style.display = 'block'; }
    function hideLoading() { loadingSpinner.style.display = 'none'; }
    
    // Initialize the application
    function init() {
        showLoading();
        loadCSVData();
    }
    
    // Load and parse CSV data
    function loadCSVData() {
        fetch('data.csv')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(csvText => {
                allData = parseCSV(csvText);
                filteredData = [...allData];
                populateFilters();
                renderTable();
                setupEventListeners();
                hideLoading();
            })
            .catch(error => {
                console.error('Error loading CSV:', error);
                hideLoading();
                alert('Error loading data. Please check console for details.');
            });
    }
    
    // Parse CSV text into array of objects
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] ? values[i].trim() : '';
            });
            return obj;
        });
    }
    
    // Populate filter dropdowns
    function populateFilters() {
        const companies = [...new Set(allData.map(item => item.Company))].filter(Boolean);
        const patterns = [...new Set(allData.map(item => item.Pattern))].filter(Boolean);
        const timeframes = [...new Set(allData.map(item => item['Time Frame']))].filter(Boolean);
        
        populateDropdown(companyFilter, companies);
        populateDropdown(patternFilter, patterns);
        populateDropdown(timeframeFilter, timeframes);
    }
    
    function populateDropdown(dropdown, items) {
        items.sort().forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            dropdown.appendChild(option);
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        [companyFilter, patternFilter, timeframeFilter].forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });
        
        tableBody.addEventListener('click', function(e) {
            const row = e.target.closest('tr');
            if (row) {
                const selectedItem = filteredData[row.dataset.index];
                renderCandlestickChart(selectedItem);
                document.querySelectorAll('#dataTable tbody tr').forEach(r => {
                    r.classList.remove('table-primary');
                });
                row.classList.add('table-primary');
            }
        });
    }
    
    // Apply filters
    function applyFilters() {
        filteredData = allData.filter(item => {
            return (!companyFilter.value || item.Company === companyFilter.value) &&
                   (!patternFilter.value || item.Pattern === patternFilter.value) &&
                   (!timeframeFilter.value || item['Time Frame'] === timeframeFilter.value);
        });
        renderTable();
    }
    
    // Render data table
    function renderTable() {
        tableBody.innerHTML = '';
        
        if (filteredData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No matching data found</td></tr>';
            return;
        }
        
        filteredData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${item.Company}</td>
                <td>${item.Pattern}</td>
                <td>${item['Time Frame']}</td>
                <td>${item['Created Date & Time']}</td>
                <td>${item.Open}</td>
                <td>${item.High}</td>
                <td>${item.Low}</td>
                <td>${item.Close}</td>
                <td>${item.Volume}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    // Render candlestick chart
    function renderCandlestickChart(selectedItem) {
        if (!selectedItem) return;
        showLoading();
        
        setTimeout(() => {
            try {
                const companyData = allData.filter(item => 
                    item.Company === selectedItem.Company && 
                    item['Time Frame'] === selectedItem['Time Frame']
                ).sort((a, b) => new Date(a['Created Date & Time']) - new Date(b['Created Date & Time']));
                
                const selectedIndex = companyData.findIndex(item => 
                    item['Created Date & Time'] === selectedItem['Created Date & Time']
                );
                
                const startIdx = Math.max(0, selectedIndex - 10);
                const endIdx = Math.min(companyData.length - 1, selectedIndex + 10);
                const chartData = companyData.slice(startIdx, endIdx + 1);
                
                const financialData = chartData.map(item => ({
                    x: new Date(item['Created Date & Time']),
                    o: parseFloat(item.Open) || 0,
                    h: parseFloat(item.High) || 0,
                    l: parseFloat(item.Low) || 0,
                    c: parseFloat(item.Close) || 0
                }));
                
                if (chart) chart.destroy();
                
                chart = new Chart(chartCanvas.getContext('2d'), {
                    type: 'candlestick',
                    data: { datasets: [{
                        label: `${selectedItem.Company} (${selectedItem['Time Frame']})`,
                        data: financialData,
                        color: { up: '#28a745', down: '#dc3545', unchanged: '#6c757d' }
                    }]},
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { 
                                type: 'time',
                                time: {
                                    parser: 'yyyy-MM-dd HH:mm:ss',
                                    tooltipFormat: 'MMM d, h:mm a',
                                    unit: 'minute',
                                    displayFormats: {
                                        minute: 'h:mm a',
                                        hour: 'h a',
                                        day: 'MMM d'
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Date/Time'
                                }
                            },
                            y: { 
                                title: {
                                    display: true,
                                    text: 'Price'
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: ctx => [
                                        `Open: ${ctx.raw.o.toFixed(2)}`,
                                        `High: ${ctx.raw.h.toFixed(2)}`,
                                        `Low: ${ctx.raw.l.toFixed(2)}`,
                                        `Close: ${ctx.raw.c.toFixed(2)}`
                                    ]
                                }
                            },
                            annotation: {
                                annotations: {
                                    highlightSelected: {
                                        type: 'box',
                                        xMin: financialData[selectedIndex - startIdx]?.x,
                                        xMax: financialData[selectedIndex - startIdx]?.x,
                                        yMin: 0,
                                        yMax: 1e6,
                                        backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                        borderColor: 'rgba(255, 193, 7, 0.5)',
                                        borderWidth: 1
                                    }
                                }
                            }
                        }
                    }
                });
                
                hideLoading();
            } catch (error) {
                console.error('Chart error:', error);
                hideLoading();
                alert('Error rendering chart. Check console for details.');
            }
        }, 500);
    }
    
    init();
});