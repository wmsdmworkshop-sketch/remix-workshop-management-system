import bcrypt from "bcryptjs";

const hash = "$2b$10$U9ekJcNuDpwWcKRb6SU6nu6ekgp8KqyI4nPW/F5kNb.XO.lpN2JL.";

bcrypt.compare("Admin@DWIP2026", hash)
    .then(result => {
        console.log("Password Match:", result);
    })
    .catch(console.error);