# Cribl POV Document Builder - User Guide

This guide covers everything you need to know about running, configuring, and using the POV Document Builder.

---

## 🚀 Running and Stopping the App

The application is containerized using Docker for consistency across environments.

### Starting the App
Open your terminal in the project directory and run:
```bash
docker-compose up --build -d
```
The app will be available at `http://localhost:8080`.

### Stopping the App
To stop the containers and free up resources:
```bash
docker-compose down
```

---

## 📝 Adding Content

You can expand the library by adding "Snippets". Snippets are reusable blocks of documentation.

### Markup Language
The app uses a custom markup engine designed for Microsoft Word compatibility.

| Style | Syntax | Result |
| :--- | :--- | :--- |
| **Bold** | `**text**` | **text** |
| *Italics* | `*text*` | *text* |
| `Inline Code` | `` `text` `` | `text` |
| **Code Block** | `CODE:` or ` ``` ` | Multi-line code block |
| **Checkboxes** | `- [ ] item` | ☐ item |
| **Bullets** | `- item` | • item |
| **Sub-bullets**| `  - item` | ◦ item (use 2 spaces) |

### Example Block
```text
### Deployment Steps
- [ ] Install **Cribl Edge** on Linux.
- [ ] Verify connectivity to `443`.

TABLE:
Source, Destination, Port, Purpose
Edge Node, Cloud, 443, Management
```

---

## 📚 Library Management

### Importing a Library
Click the **Upload (Import)** icon in the sidebar. Select a `.json` library file to merge its contents into your current local library.

### Exporting a Library
Click the **Download (Export)** icon in the sidebar. This saves your entire library of snippets as a portable JSON file.

---

## 🔄 Resetting Session
The **Trash** icon in the header sidebar allows you to "Reset Session".
- **What it clears**: Customer info, checked items, uploaded architecture images, and custom ports.
- **What it keeps**: Your snippet library remains intact.

---

## 🏢 POV Details

Access this via the large button at the top of the sidebar.
- **Customer Logo**: Upload the client's logo to brand the document.
- **Cribl/Brand Logo**: Upload your SE or company logo. This appears in the document header.
- **SE/RSM Info**: Enter contact details to populate the "POV Details" table in the Word doc.

---

## 🏗️ Uploading POV Architecture
1. In the sidebar, navigate to the **ENVIRONMENT** category.
2. Check the box for **POV Architecture**.
3. Click **Upload Image** and select your diagram (PNG/JPG).
4. This will insert the architecture diagram at the beginning of the environment section.

---

## 🔌 Adding Custom Ports
While the library contains standard ports, you can add engagement-specific ones:
1. Go to the **REQUIRED PORTS** category in the sidebar.
2. Click **Add Custom Port**.
3. **Format Example**:
   - **Protocol**: `TCP`
   - **Port**: `6514`
   - **Result**: `TCP 6514`
4. These ports are automatically merged into the "Required Ports" table in the document.

---

## ✅ Adding Success Criteria
1. Go to the **SUCCESS CRITERIA** category.
2. Click **Add Success Criteria**.
3. Select a category (e.g., Data Reduction) and add specific details.
4. Mark them as **Completed** (check the box) to show a checkmark in the final export.

---

## 💾 Session Management

### Saving a Session
Click the **Disk/Save** icon in the header. This saves your *current progress* (customer names, specific checkboxes, etc.) as a JSON file.

### Loading a Session
Click the **Cloud/Upload** icon in the header. Select a previously saved session file to restore your work exactly where you left off.

---

## 📄 Exporting to Word

### The Process
Click **Export Word** in the top right. This downloads a `.doc` file.
- **Why .doc?**: The app generates a specialized HTML document that Microsoft Word reads natively to maintain complex formatting and images.

### Slack / Binary File Issue
When you send the `.doc` file directly to someone via Slack, it might appear as a "Binary File" because Slack sees the HTML headers inside.

### Fix: Saving as a True .docx
To make it a standard Word file recognized by all apps:
1. Open the downloaded `.doc` file in **Microsoft Word**.
2. Go to **File > Save As**.
3. Change the format dropdown to **Word Document (.docx)**.
4. Save the file. It is now a true binary Word document.
