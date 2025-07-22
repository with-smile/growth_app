document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 ---
    const loginPage = document.getElementById('login-page');
    const appPage = document.getElementById('app');
    const adminPage = document.getElementById('admin-page'); // 管理者ページ
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
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
    const deleteUserButton = document.getElementById('delete-user-button'); // 追加
    const adminHeightInput = document.getElementById('admin-height');
    const adminWeightInput = document.getElementById('admin-weight');
    const adminDateInput = document.getElementById('admin-record-date');
    const adminSaveButton = document.getElementById('admin-save-button');
    const adminRecordTableBody = document.getElementById('admin-record-table-body');
    const adminGrowthChartCanvas = document.getElementById('admin-growth-chart').getContext('2d');
    const adminUsernameInput = document.getElementById('admin-username');
    const adminPasswordInput = document.getElementById('admin-password');
    const saveAdminButton = document.getElementById('save-admin-button');

    let currentUser = null;
    let growthChart = null;
    let adminGrowthChart = null; // 管理者用グラフ

    // --- ログイン処理 ---
    loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (username === '') {
            loginError.textContent = '名前を入力してください。';
            return;
        }

        // localStorageから管理者情報を取得 (なければデフォルト値)
        const adminCreds = JSON.parse(localStorage.getItem('adminCredentials')) || { user: 'admin', pass: 'adminpass' };

        // 管理者ログイン
        if (username === adminCreds.user && password === adminCreds.pass) {
            currentUser = 'admin';
            showAdminPage();
        }
        // 閲覧者ログイン
        else if (password === '001') {
            // adminCredentialsはユーザーではないので除外
            const allUsers = Object.keys(localStorage).filter(key => key !== 'adminCredentials');
            if (allUsers.includes(username)) {
                currentUser = username;
                showAppPage();
            } else {
                loginError.textContent = 'その名前のユーザーは存在しません。';
            }
        } else {
            loginError.textContent = 'IDまたはパスワードが正しくありません。';
        }
    });

    // --- ログアウト処理 ---
    logoutButton.addEventListener('click', showLoginPage);

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
        saveRecord(currentUser, record, null); // 対象ユーザーに保存

        // 再描画
        loadUserRecords(currentUser, recordTableBody, growthChart, growthChartCanvas);

        // 入力欄をクリア
        heightInput.value = '';
        weightInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
    });

    // --- ページ表示切り替え ---
    function showLoginPage() {
        loginPage.style.display = 'block';
        appPage.style.display = 'none';
        adminPage.style.display = 'none'; // 管理者ページも非表示
        usernameInput.value = '';
        passwordInput.value = '';
        loginError.textContent = '';
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
        loadAdminCredentials(); // 管理者情報をフォームに表示
        populateUserSelect();
        // 初期表示として最初のユーザーのデータを読み込む
        if (userSelect.options.length > 0) {
            loadUserRecords(userSelect.value, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        } else {
            // ユーザーがいない場合はクリア
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
        if (currentUser === 'admin') {
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
        if (currentUser === 'admin') {
            adminGrowthChart = updateChart(user, chartInstance, chartCanvas);
        } else {
            growthChart = updateChart(user, chartInstance, chartCanvas);
        }
    }

    // テーブルに行を追加する関数
    function addRecordToTable(user, record, index, tableBody) {
        const tr = document.createElement('tr');
        tr.dataset.index = index;

        // record.height や record.weight が null の場合は '—' を表示
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

        const editButton = tr.querySelector('.edit-button');
        const deleteButton = tr.querySelector('.delete-button');

        deleteButton.addEventListener('click', () => {
            if (confirm(`【${record.date}】の記録を削除しますか？`)) {
                deleteRecord(user, index);
            }
        });

        editButton.addEventListener('click', () => {
            switchToEditMode(user, tr, record, index, tableBody);
        });

        tableBody.appendChild(tr);
    }

    function switchToEditMode(user, tr, record, index, tableBody) {
        // 編集用の入力欄を持った行のHTMLを作成
        // record.height や record.weight が null の場合は空文字 '' を value に設定
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

        const saveEditButton = tr.querySelector('.save-edit-button');
        saveEditButton.addEventListener('click', () => {
            // クラス名を元に、より確実に要素を取得する
            const newDate = tr.querySelector('.edit-date').value;
            const newHeight = tr.querySelector('.edit-height').value ? parseFloat(tr.querySelector('.edit-height').value) : null;
            const newWeight = tr.querySelector('.edit-weight').value ? parseFloat(tr.querySelector('.edit-weight').value) : null;

            if (!newDate || (newHeight === null && newWeight === null)) {
                alert('日付を入力し、身長または体重の少なくとも一方を入力してください。');
                return;
            }

            const updatedRecord = { date: newDate, height: newHeight, weight: newWeight };
            saveRecord(user, updatedRecord, index);
            
            // 現在のページに応じて再描画
            if (currentUser === 'admin') {
                loadUserRecords(user, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
            } else {
                loadUserRecords(user, recordTableBody, growthChart, growthChartCanvas);
            }
        });
    }

    // --- グラフの更新 (汎用化) ---
    function updateChart(user, chartInstance, chartCanvas) {
        const records = getRecords(user);
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
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: '体重 (kg)',
                        data: weightData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y-axis-weight',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    'y-axis-height': {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: '身長 (cm)'
                        }
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
                        }
                    }
                }
            }
        });
        return newChartInstance;
    }

    // --- 管理者ページ専用の関数 ---

    // 管理者情報をフォームに表示
    function loadAdminCredentials() {
        const adminCreds = JSON.parse(localStorage.getItem('adminCredentials')) || { user: 'admin', pass: '' };
        adminUsernameInput.value = adminCreds.user;
        adminPasswordInput.value = ''; // パスワードは表示しない
    }

    // 管理者情報を保存
    saveAdminButton.addEventListener('click', () => {
        const newAdminUser = adminUsernameInput.value.trim();
        const newAdminPass = adminPasswordInput.value.trim();

        if (!newAdminUser) {
            alert('管理者IDは空にできません。');
            return;
        }

        const currentCreds = JSON.parse(localStorage.getItem('adminCredentials')) || { user: 'admin', pass: 'adminpass' };
        
        // パスワードが入力されている場合のみ更新
        const finalPass = newAdminPass ? newAdminPass : currentCreds.pass;

        const newCreds = { user: newAdminUser, pass: finalPass };
        localStorage.setItem('adminCredentials', JSON.stringify(newCreds));
        alert('管理者情報を更新しました。');
        adminPasswordInput.value = '';
    });

    // ユーザー選択ドロップダウンを生成
    function populateUserSelect() {
        userSelect.innerHTML = '';
        const allUsers = Object.keys(localStorage).filter(key => key !== 'adminCredentials'); // 管理者情報は除外
        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            userSelect.appendChild(option);
        });
    }

    // 新規ユーザー作成
    createUserButton.addEventListener('click', () => {
        const newUserName = newUserNameInput.value.trim();
        if (newUserName && newUserName !== 'admin' && !localStorage.getItem(newUserName)) {
            localStorage.setItem(newUserName, JSON.stringify([])); // 空のデータで作成
            newUserNameInput.value = '';
            populateUserSelect();
            // 作成したユーザーを選択状態にする
            userSelect.value = newUserName;
            loadUserRecords(newUserName, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
        } else if (localStorage.getItem(newUserName)) {
            alert('その名前のユーザーは既に存在します。');
        } else {
            alert('有効な名前を入力してください。');
        }
    });

    // 選択中のユーザーを削除
    deleteUserButton.addEventListener('click', () => {
        const selectedUser = userSelect.value;
        if (!selectedUser) {
            alert('削除するユーザーを選択してください。');
            return;
        }

        if (confirm(`本当にユーザー「${selectedUser}」を削除しますか？\nこの操作は元に戻せません。`)) {
            localStorage.removeItem(selectedUser);
            alert(`ユーザー「${selectedUser}」を削除しました。`);
            // 管理者ページを再初期化して、ユーザーリストと表示を更新
            showAdminPage();
        }
    });

    userSelect.addEventListener('change', () => {
        const selectedUser = userSelect.value;
        loadUserRecords(selectedUser, adminRecordTableBody, adminGrowthChart, adminGrowthChartCanvas);
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

    adminLogoutButton.addEventListener('click', showLoginPage);

    // --- 初期表示 ---
    showLoginPage();
});