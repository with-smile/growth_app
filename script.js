document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 ---
    const loginPage = document.getElementById('login-page');
    const appPage = document.getElementById('app');
    const adminPage = document.getElementById('admin-page');
    const usernameInput = document.getElementById('username');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');

    // --- 閲覧者ページの要素 ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const dateInput = document.getElementById('record-date');
    const saveButton = document.getElementById('save-button');
    const recordTableBody = document.getElementById('record-table-body');
    const growthChartCanvas = document.getElementById('growth-chart').getContext('2d');

    // --- 管理者ページの要素 ---
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const userSelect = document.getElementById('user-select');
    const newUserNameInput = document.getElementById('new-user-name');
    const createUserButton = document.getElementById('create-user-button');
    const renameUserButton = document.getElementById('rename-user-button');
    const deleteUserButton = document.getElementById('delete-user-button');
    const adminHeightInput = document.getElementById('admin-height');
    const adminWeightInput = document.getElementById('admin-weight');
    const adminDateInput = document.getElementById('admin-record-date');
    const adminSaveButton = document.getElementById('admin-save-button');
    const adminRecordTableBody = document.getElementById('admin-record-table-body');
    const adminGrowthChartCanvas = document.getElementById('admin-growth-chart').getContext('2d');
    
    // --- 定数 ---
    const ADMIN_USERNAME = 'FC一宮シティ';

    let currentUser = null;
    let growthChart = null;
    let adminGrowthChart = null;

    // --- ログイン処理 ---
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();

        if (username === '') {
            loginError.textContent = '名前を入力してください。';
            return;
        }

        currentUser = username;

        if (username === ADMIN_USERNAME) {
            if (!localStorage.getItem(ADMIN_USERNAME)) {
                localStorage.setItem(ADMIN_USERNAME, JSON.stringify([]));
            }
            showAdminPage();
        } else {
            if (!localStorage.getItem(username)) {
                localStorage.setItem(username, JSON.stringify([]));
            }
            showAppPage();
        }
    });

    // --- ログアウト処理 ---
    logoutButton.addEventListener('click', showLoginPage);
    adminLogoutButton.addEventListener('click', showLoginPage);

    // --- データ保存処理 ---
    saveButton.addEventListener('click', () => {
        const height = heightInput.value ? parseFloat(heightInput.value) : null;
        const weight = weightInput.value ? parseFloat(weightInput.value) : null;
        const date = dateInput.value;

        if (!date || (height === null && weight === null)) {
            alert('日付を入力し、身長または体重の少なくとも一方を入力してください。');
            return;
        }

        const record = { date, height, weight };
        saveRecord(currentUser, record, null);

        loadUserRecords(currentUser, recordTableBody, growthChart, growthChartCanvas);

        heightInput.value = '';
        weightInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
    });

    // --- ページ表示切り替え ---
    function showLoginPage() {
        loginPage.style.display = 'block';
        appPage.style.display = 'none';
        adminPage.style.display = 'none';
        usernameInput.value = '';
        loginError.textContent = '';
        currentUser = null;
    }

    function showAppPage() {
        loginPage.style.display = 'none';
        appPage.style.display = 'block';
        adminPage.style.display = 'none';
        welcomeMessage.textContent = `${currentUser}さんの記録`;
        dateInput.value = new Date().toISOString().split('T')[0];
        loadUserRecords(currentUser, recordTableBody, growthChart, growthChartCanvas);
    }

    function showAdminPage() {
        loginPage.style.display = 'none';
        appPage.style.display = 'none';
        adminPage.style.display = 'block';
        adminDateInput.value = new Date().toISOString().split('T')[0];
        populateUserSelect();
        
        if (userSelect.options.length > 0) {
            loadUserRecords(userSelect.value, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        } else {
            adminRecordTableBody.innerHTML = '';
            if(adminGrowthChart) adminGrowthChart.destroy();
        }
    }

    // --- データ永続化 (localStorage) ---
    function getRecords(user) {
        return JSON.parse(localStorage.getItem(user)) || [];
    }

    function saveAllRecords(user, records) {
        records.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem(user, JSON.stringify(records));
    }

    function saveRecord(user, record, index) {
        const records = getRecords(user);
        if (index === null) {
            records.push(record);
        } else {
            records[index] = record;
        }
        saveAllRecords(user, records);
    }

    function deleteRecord(user, index) {
        let records = getRecords(user);
        records.splice(index, 1);
        saveAllRecords(user, records);
        if (currentUser === ADMIN_USERNAME) {
            loadUserRecords(user, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        } else {
            loadUserRecords(user, recordTableBody, growthChart, growthChartCanvas);
        }
    }

    // --- ユーザーデータ読み込みと表示 (汎用化) ---
    function loadUserRecords(user, tableBody, chartInstance, chartCanvas) {
        tableBody.innerHTML = '';
        const records = getRecords(user);
        records.forEach((record, index) => {
            addRecordToTable(user, record, index, tableBody);
        });
        if (currentUser === ADMIN_USERNAME) {
            adminGrowthChart = updateChart(user, chartInstance, chartCanvas);
        } else {
            growthChart = updateChart(user, chartInstance, chartCanvas);
        }
    }

    function addRecordToTable(user, record, index, tableBody) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;
        const heightDisplay = record.height !== null ? record.height : '—';
        const weightDisplay = record.weight !== null ? record.weight : '—';

        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${heightDisplay}</td>
            <td>${weightDisplay}</td>
            <td class="action-buttons">
                <button class="edit-button">編集</button>
                <button class="delete-button">削除</button>
            </td>
        `;

        tr.querySelector('.delete-button').addEventListener('click', () => {
            if (confirm(`【${record.date}】の記録を削除しますか？`)) {
                deleteRecord(user, index);
            }
        });

        tr.querySelector('.edit-button').addEventListener('click', () => {
            switchToEditMode(user, tr, record, index, tableBody);
        });

        tableBody.appendChild(tr);
    }

    function switchToEditMode(user, tr, record, index, tableBody) {
        const heightValue = record.height !== null ? record.height : '';
        const weightValue = record.weight !== null ? record.weight : '';

        tr.innerHTML = `
            <td><input type="date" class="edit-date" value="${record.date}"></td>
            <td><input type="number" class="edit-height" value="${heightValue}" step="0.1" placeholder="身長"></td>
            <td><input type="number" class="edit-weight" value="${weightValue}" step="0.1" placeholder="体重"></td>
            <td class="action-buttons">
                <button class="save-edit-button">保存</button>
            </td>
        `;

        tr.querySelector('.save-edit-button').addEventListener('click', () => {
            const newDate = tr.querySelector('.edit-date').value;
            const newHeight = tr.querySelector('.edit-height').value ? parseFloat(tr.querySelector('.edit-height').value) : null;
            const newWeight = tr.querySelector('.edit-weight').value ? parseFloat(tr.querySelector('.edit-weight').value) : null;

            if (!newDate || (newHeight === null && newWeight === null)) {
                alert('日付を入力し、身長または体重の少なくとも一方を入力してください。');
                return;
            }

            const updatedRecord = { date: newDate, height: newHeight, weight: newWeight };
            saveRecord(user, updatedRecord, index);
            
            if (currentUser === ADMIN_USERNAME) {
                loadUserRecords(user, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
            } else {
                loadUserRecords(user, recordTableBody, growthChart, growthChartCanvas);
            }
        });
    }

    // --- グラフの更新 (汎用化) ---
    function updateChart(user, chartInstance, chartCanvas) {
        const records = getRecords(user); // Records are already sorted by date

        const labels = records.map(r => r.date);
        const heightData = records.map(r => r.height);
        const weightData = records.map(r => r.weight);

        if (chartInstance) {
            chartInstance.destroy();
        }

        const newChartInstance = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '身長 (cm)',
                        data: heightData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        yAxisID: 'y-axis-height',
                        spanGaps: true, // nullデータを飛び越えて線を描画
                        tension: 0.1
                    },
                    {
                        label: '体重 (kg)',
                        data: weightData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y-axis-weight',
                        spanGaps: true, // nullデータを飛び越えて線を描画
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: '日付'
                        }
                    },
                    'y-axis-height': {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: '身長 (cm)'
                        },
                        beginAtZero: false
                    },
                    'y-axis-weight': {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: '体重 (kg)'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        beginAtZero: false
                    }
                }
            }
        });
        return newChartInstance;
    }

    // --- 管理者ページ専用の関数 ---

    function populateUserSelect() {
        userSelect.innerHTML = '';
        const allUsers = Object.keys(localStorage).filter(key => key !== ADMIN_USERNAME);
        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            userSelect.appendChild(option);
        });
    }

    createUserButton.addEventListener('click', () => {
        const newUserName = newUserNameInput.value.trim();
        if (newUserName && newUserName !== ADMIN_USERNAME && !localStorage.getItem(newUserName)) {
            localStorage.setItem(newUserName, JSON.stringify([]));
            newUserNameInput.value = '';
            populateUserSelect();
            userSelect.value = newUserName;
            loadUserRecords(newUserName, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        } else if (localStorage.getItem(newUserName)) {
            alert('その名前のユーザーは既に存在します。');
        } else if (newUserName === ADMIN_USERNAME) {
            alert('その名前は管理者用のため使用できません。');
        } else {
            alert('有効な名前を入力してください。');
        }
    });

    renameUserButton.addEventListener('click', () => {
        const oldUsername = userSelect.value;
        if (!oldUsername) {
            alert('名前を変更するユーザーを選択してください。');
            return;
        }

        const newUsername = prompt(`「${oldUsername}」の新しい名前を入力してください:`);

        if (!newUsername || newUsername.trim() === '') {
            alert('新しい名前を入力してください。');
            return;
        }

        const trimmedNewUsername = newUsername.trim();

        if (trimmedNewUsername === ADMIN_USERNAME) {
            alert('その名前は管理者用のため使用できません。');
            return;
        }

        if (localStorage.getItem(trimmedNewUsername)) {
            alert('その名前のユーザーは既に存在します。');
            return;
        }

        const records = localStorage.getItem(oldUsername);
        localStorage.setItem(trimmedNewUsername, records);
        localStorage.removeItem(oldUsername);

        alert(`ユーザー「${oldUsername}」の名前を「${trimmedNewUsername}」に変更しました。`);
        
        // ユーザー選択プルダウンを更新
        populateUserSelect();
        userSelect.value = trimmedNewUsername; // 新しい名前を選択状態にする
        loadUserRecords(trimmedNewUsername, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
    });

    deleteUserButton.addEventListener('click', () => {
        const selectedUser = userSelect.value;
        if (!selectedUser) {
            alert('削除するユーザーを選択してください。');
            return;
        }

        if (selectedUser === ADMIN_USERNAME) {
            alert('管理者は削除できません。');
            return;
        }

        if (confirm(`本当にユーザー「${selectedUser}」を削除しますか？\nこの操作は元に戻せません。`)) {
            localStorage.removeItem(selectedUser);
            alert(`ユーザー「${selectedUser}」を削除しました。`);
            showAdminPage();
        }
    });

    userSelect.addEventListener('change', () => {
        const selectedUser = userSelect.value;
        if (selectedUser) {
            loadUserRecords(selectedUser, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        }
    });

    adminSaveButton.addEventListener('click', () => {
        const selectedUser = userSelect.value;
        if (!selectedUser) {
            alert('対象のユーザーを選択してください。');
            return;
        }
        const height = adminHeightInput.value ? parseFloat(adminHeightInput.value) : null;
        const weight = adminWeightInput.value ? parseFloat(adminWeightInput.value) : null;
        const date = adminDateInput.value;

        if (!date || (height === null && weight === null)) {
            alert('日付を入力し、身長または体重の少なくとも一方を入力してください。');
            return;
        }

        const record = { date, height, weight };
        saveRecord(selectedUser, record, null);
        loadUserRecords(selectedUser, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);

        adminHeightInput.value = '';
        adminWeightInput.value = '';
        adminDateInput.value = new Date().toISOString().split('T')[0];
    });

    // --- 初期表示 ---
    showLoginPage();
});