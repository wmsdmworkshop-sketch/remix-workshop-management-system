async function test() {
  const passwords = ['admin123', 'Admin@DWIP2026', 'developer', 'Dev@DWIP2026'];
  const usernames = ['admin', 'developer', 'mustafa'];
  
  for (const username of usernames) {
    for (const password of passwords) {
      try {
        const res = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
          console.log(`SUCCESS: username = ${username}, password = ${password}, role = ${data.user.role}, token = ${data.token.slice(0, 20)}...`);
        } else {
          // console.log(`FAILED: username = ${username}, password = ${password}, error = ${data.error}`);
        }
      } catch (err) {
        console.error('Error on fetch:', err.message);
      }
    }
  }
}

test();
