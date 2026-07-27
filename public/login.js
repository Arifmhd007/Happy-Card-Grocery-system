async function handleAuth(role, action) {
    const prefix = role === 'customer' ? 'cust' : 'admin';
    const usernameInput = document.getElementById(`${prefix}Username`).value;
    const passwordInput = document.getElementById(`${prefix}Password`).value;

    if (!usernameInput || !passwordInput) return alert("Enter credentials.");

    const endpoint = action === 'login' ? '/api/login' : '/api/register';
    try {
        const res = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput, role: role })
        });
        const result = await res.json();
        if (!res.ok) return alert(result.error);

        if (action === 'login') {
            localStorage.setItem('currentUser', result.username);
            localStorage.setItem('userRole', result.role);
            window.location.href = result.role === 'admin' ? 'admin.html' : 'index.html';
        } else {
            alert(result.message);
        }
    } catch (e) { alert("Server error."); }
}