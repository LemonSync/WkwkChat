function packageName() {
    const version = '1.0.0';
    const lastName = ["WkwkChat", "ChatWkwk", "ChatWeb", "WebChat", "LemonProject", "LemonChat", "WkwkProject", "WkwkLemon", "Wkwk Chat", "Chat Wkwk", "Lemon Project", "Lemon Chat", "Wkwk Project", "Wkwk Lemon"];
    const firstName = ["LemonSync", "Lemon", "Eres", "Eres Simbolon", "Lemon Sync","Lemon (Eres)", "Eres SMKN 9 Medan"]
    const randomFirstName = firstName[Math.floor(Math.random() * firstName.length)];
    const randomLastName = lastName[Math.floor(Math.random() * lastName.length)];
    return [randomFirstName, randomLastName, version];
}

module.exports = { packageName };