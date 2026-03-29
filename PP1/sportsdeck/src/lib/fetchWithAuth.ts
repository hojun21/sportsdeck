export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");

    let res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
        credentials: "include",
    });

    // If user sign out, block from running api/auth/refresh and get new token
    if (res.status === 401 && !url.includes("signout")) {
        
        // if access token expires, get new refresh token
        const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("accessToken", data.accessToken);
            
            res = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${data.accessToken}`,
                },
                credentials: "include",
            });
        } else {
            // If refresh fails, then remove user info and sign out.
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            if (!window.location.pathname.includes("/signin")) {
                window.location.href = "/signin";
            }
        }
    }

    return res;
}