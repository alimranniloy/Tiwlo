import { useState, Dispatch, SetStateAction, FormEvent, DragEvent, ChangeEvent, useEffect } from "react";
import { 
  Folder, 
  File, 
  ArrowLeft, 
  Plus, 
  FolderPlus, 
  FilePlus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Save, 
  Upload, 
  X,
  Search,
  ChevronRight,
  Database,
  Cpu,
  Globe,
  Shield,
  Download,
  FileArchive,
  RefreshCw,
  Copy,
  // Premium Google Icons
  FolderOpen,
  FolderArchive,
  FolderUp,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  Lock,
  Layers,
  Inbox,
  Monitor,
  Tag
} from "lucide-react";
import { VirtualItem } from "../types";

interface FileManagerProps {
  files: VirtualItem[];
  setFiles: Dispatch<SetStateAction<VirtualItem[]>>;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
  openAiWithPrompt: (prompt: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function FileManager({ files, setFiles, addActivity, openAiWithPrompt, setActiveTab }: FileManagerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root-dir"); // start at root-dir
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  // Multiple Item Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Right-Click Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: VirtualItem;
  } | null>(null);

  // File Editor state
  const [editingFile, setEditingFile] = useState<VirtualItem | null>(null);
  const [editorContent, setEditorContent] = useState("");
  
  // Drag and drop upload state
  const [dragActive, setDragActive] = useState(false);

  // Advanced operations state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<VirtualItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isChmodModalOpen, setIsChmodModalOpen] = useState(false);
  const [itemToChmod, setItemToChmod] = useState<VirtualItem | null>(null);

  // Permissions checkboxes
  const [permUserRead, setPermUserRead] = useState(true);
  const [permUserWrite, setPermUserWrite] = useState(true);
  const [permUserExec, setPermUserExec] = useState(true);

  const [permGroupRead, setPermGroupRead] = useState(true);
  const [permGroupWrite, setPermGroupWrite] = useState(false);
  const [permGroupExec, setPermGroupExec] = useState(true);

  const [permWorldRead, setPermWorldRead] = useState(true);
  const [permWorldWrite, setPermWorldWrite] = useState(false);
  const [permWorldExec, setPermWorldExec] = useState(true);

  const [clipBoardIds, setClipBoardIds] = useState<string[]>([]);
  const [clipBoardMode, setClipBoardMode] = useState<"copy" | "cut">("copy");

  // Dismiss context menu on left click anywhere
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Helper to find parent folder ID
  const getCurrentFolder = () => {
    return files.find(f => f.id === currentFolderId) || files[0];
  };

  const getBreadcrumbs = () => {
    const list: VirtualItem[] = [];
    let current = getCurrentFolder();
    while (current) {
      list.unshift(current);
      if (current.parentId) {
        const parent = files.find(f => f.id === current.parentId);
        if (parent) {
          current = parent;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return list;
  };

  // Get Children of Current Path
  const currentItems = files.filter(f => f.parentId === currentFolderId);

  // Filtered by Search Query
  const filteredItems = searchQuery.trim() === ""
    ? currentItems
    : files.filter(f => f.parentId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Premium GCP/Google Cloud inspired custom Icon Resolver (No raw emojis)
  const getItemIcon = (item: VirtualItem, className = "w-5 h-5") => {
    if (item.type === "directory") {
      if (item.name === "public_html") {
        return <FolderOpen className={`${className} text-indigo-400`} />;
      }
      if (item.name === "backups") {
        return <FolderArchive className={`${className} text-amber-500`} />;
      }
      if (item.name === "logs") {
        return <Folder className={`${className} text-slate-400`} />;
      }
      if (item.name === "node_modules") {
        return <Folder className={`${className} text-emerald-500 h-5 w-5`} />;
      }
      if (item.name === "api") {
        return <FolderOpen className={`${className} text-pink-400`} />;
      }
      return <Folder className={`${className} text-amber-400 fill-amber-400/5`} />;
    }
    
    const name = item.name.toLowerCase();
    if (name.endsWith(".zip") || name.endsWith(".tar.gz") || name.endsWith(".rar")) {
      return <FileArchive className={`${className} text-rose-500 fill-rose-500/5`} />;
    }
    if (name.endsWith(".html") || name.endsWith(".htm")) {
      return <Globe className={`${className} text-sky-400`} />;
    }
    if (name.endsWith(".css")) {
      return <FileCode className={`${className} text-pink-400`} />;
    }
    if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".jsx") || name.endsWith(".tsx")) {
      return <FileCode className={`${className} text-amber-400`} />;
    }
    if (name.endsWith(".json")) {
      return <FileJson className={`${className} text-teal-400`} />;
    }
    if (name.endsWith(".sql") || name.endsWith(".db")) {
      return <Database className={`${className} text-emerald-400`} />;
    }
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".svg")) {
      return <FileImage className={`${className} text-indigo-400`} />;
    }
    if (name.endsWith(".php")) {
      return <FileCode className={`${className} text-violet-400`} />;
    }
    if (name.endsWith(".py")) {
      return <FileCode className={`${className} text-blue-400`} />;
    }
    if (name.endsWith(".md")) {
      return <FileText className={`${className} text-cyan-400`} />;
    }
    if (name.endsWith(".txt")) {
      return <FileText className={`${className} text-slate-500`} />;
    }
    if (name.endsWith(".env") || name.endsWith(".env.example")) {
      return <Lock className={`${className} text-rose-505`} />;
    }
    return <File className={`${className} text-slate-400`} />;
  };

  // Checkbox Multiselect Handlers
  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredItems.some(i => i.id === id)));
    } else {
      const added = [...selectedIds];
      filteredItems.forEach(i => {
        if (!added.includes(i.id)) added.push(i.id);
      });
      setSelectedIds(added);
    }
  };

  const handleRowCheckboxToggle = (e: ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to permanently delete these ${selectedIds.length} items?`)) {
      setFiles(prev => prev.filter(f => !selectedIds.includes(f.id) && !(f.parentId && selectedIds.includes(f.parentId))));
      addActivity("file", `Bulk deleted ${selectedIds.length} resource elements`);
      setSelectedIds([]);
    }
  };

  const handleBulkCompress = () => {
    if (selectedIds.length === 0) return;
    const nameSeed = "bulk_archive_" + Math.random().toString(36).substr(2, 4) + ".zip";
    
    // Total sizes
    let totalSize = 0;
    selectedIds.forEach(id => {
      const match = files.find(f => f.id === id);
      if (match) totalSize += match.size || 500;
    });

    const zipItem: VirtualItem = {
      id: "zip-" + Math.random().toString(36).substr(2, 9),
      name: nameSeed,
      type: "file",
      parentId: currentFolderId,
      size: totalSize || 4096,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      content: `SIMULATED MULTIPLE COMPRESSION ZIP FILE CONTAINING: [${selectedIds.map(id => files.find(f => f.id === id)?.name).filter(Boolean).join(", ")}]`,
      permissions: "0644"
    };

    setFiles(prev => [...prev, zipItem]);
    addActivity("file", `Compressed ${selectedIds.length} files successfully into "${nameSeed}"`);
    alert(`Success! Generated multiple selection archive "${nameSeed}" under this folder.`);
    setSelectedIds([]);
  };

  const handleBulkCopy = () => {
    if (selectedIds.length === 0) return;
    setClipBoardIds(selectedIds);
    setClipBoardMode("copy");
    alert(`Copied ${selectedIds.length} items to clipboard. Now navigate to any folder and use custom Right-Click to Paste!`);
  };

  const handleBulkCut = () => {
    if (selectedIds.length === 0) return;
    setClipBoardIds(selectedIds);
    setClipBoardMode("cut");
    alert(`Cut ${selectedIds.length} items. Navigate to target folder and Custom Right-Click to Paste/Move!`);
  };

  const handlePasteClipboard = () => {
    if (clipBoardIds.length === 0) return;

    if (clipBoardMode === "copy") {
      // Create fresh copies with new IDs but set currentFolderId as parent
      const copies: VirtualItem[] = [];
      clipBoardIds.forEach(id => {
        const source = files.find(f => f.id === id);
        if (!source) return;

        const newId = "copy-" + Math.random().toString(36).substr(2, 9);
        copies.push({
          ...source,
          id: newId,
          parentId: currentFolderId,
          name: source.name.includes(".") 
            ? source.name.split(".").slice(0, -1).join(".") + "_copy." + source.name.split(".").pop()
            : source.name + "_copy",
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      });
      setFiles(prev => [...prev, ...copies]);
      addActivity("file", `Pasted clipboard contents with copy mode (${copies.length} items)`);
    } else {
      // Move items by updating parentIds
      setFiles(prev => prev.map(f => {
        if (clipBoardIds.includes(f.id)) {
          return { ...f, parentId: currentFolderId, updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
        }
        return f;
      }));
      addActivity("file", `Moved ${clipBoardIds.length} resource elements to current folder`);
    }

    setClipBoardIds([]);
    alert("Items pasted/moved successfully!");
  };

  // Right-Click Event Handler
  const handleContextMenuTrigger = (e: any, item: VirtualItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Coordinate relative to viewport
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  // Calculate Octal Chmod permissions string
  const getCalculatedOctal = () => {
    const user = (permUserRead ? 4 : 0) + (permUserWrite ? 2 : 0) + (permUserExec ? 1 : 0);
    const group = (permGroupRead ? 4 : 0) + (permGroupWrite ? 2 : 0) + (permGroupExec ? 1 : 0);
    const world = (permWorldRead ? 4 : 0) + (permWorldWrite ? 2 : 0) + (permWorldExec ? 1 : 0);
    return `0${user}${group}${world}`;
  };

  // Open Permissions Modal
  const openChmodModal = (item: VirtualItem) => {
    setItemToChmod(item);
    const currentPermissions = item.permissions || (item.type === "directory" ? "0755" : "0644");
    
    // Parse digits
    const u = parseInt(currentPermissions[1] || "6");
    const g = parseInt(currentPermissions[2] || "4");
    const w = parseInt(currentPermissions[3] || "4");

    setPermUserRead((u & 4) !== 0);
    setPermUserWrite((u & 2) !== 0);
    setPermUserExec((u & 1) !== 0);

    setPermGroupRead((g & 4) !== 0);
    setPermGroupWrite((g & 2) !== 0);
    setPermGroupExec((g & 1) !== 0);

    setPermWorldRead((w & 4) !== 0);
    setPermWorldWrite((w & 2) !== 0);
    setPermWorldExec((w & 1) !== 0);

    setIsChmodModalOpen(true);
  };

  // Save Permissions Command
  const handleSaveChmod = () => {
    if (!itemToChmod) return;
    const finalOctal = getCalculatedOctal();

    setFiles(prev => prev.map(f => {
      if (f.id === itemToChmod.id) {
        return { ...f, permissions: finalOctal };
      }
      return f;
    }));

    addActivity("file", `Modified permissions for "${itemToChmod.name}" to ${finalOctal}`);
    setIsChmodModalOpen(false);
    setItemToChmod(null);
  };

  // Open Rename Modal
  const openRenameModal = (item: VirtualItem) => {
    setItemToRename(item);
    setRenameValue(item.name);
    setIsRenameModalOpen(true);
  };

  // Save Rename command
  const handleSaveRename = (e: FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !renameValue.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.id !== itemToRename.id && f.name.toLowerCase() === renameValue.trim().toLowerCase())) {
      alert("An item with this name already exists in this directory.");
      return;
    }

    setFiles(prev => prev.map(f => {
      if (f.id === itemToRename.id) {
        return { ...f, name: renameValue.trim(), updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      }
      return f;
    }));

    addActivity("file", `Renamed "${itemToRename.name}" to "${renameValue.trim()}"`);
    setIsRenameModalOpen(false);
    setItemToRename(null);
  };

  // Create folder
  const handleCreateFolder = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      alert("A folder or file with this name already exists here.");
      return;
    }

    const newFolder: VirtualItem = {
      id: "dir-" + Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      type: "directory",
      parentId: currentFolderId,
      size: 4096,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      permissions: "0755"
    };

    setFiles(prev => [...prev, newFolder]);
    addActivity("file", `Created folder: ${newFolder.name} under ${getCurrentFolder().name}`);
    setNewItemName("");
    setIsNewFolderModalOpen(false);
  };

  // Create file
  const handleCreateFile = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      alert("A folder or file with this name already exists here.");
      return;
    }

    const newFile: VirtualItem = {
      id: "file-" + Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      type: "file",
      parentId: currentFolderId,
      size: 0,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      content: "",
      permissions: "0644"
    };

    setFiles(prev => [...prev, newFile]);
    addActivity("file", `Created empty file: ${newFile.name}`);
    setNewItemName("");
    setIsNewFileModalOpen(false);
    
    // Automatically open in editor
    setEditingFile(newFile);
    setEditorContent("");
  };

  // Physical dynamic file download logic
  const triggerPhysicalDownload = (file: VirtualItem) => {
    try {
      const blob = new Blob([file.content || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addActivity("file", `Downloaded physical file backup: ${file.name}`);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  // Simulated zip archive compression
  const compressToZip = (item: VirtualItem) => {
    const archiveName = item.name.includes(".") 
      ? item.name.split(".")[0] + ".zip" 
      : item.name + ".zip";

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === archiveName.toLowerCase())) {
      alert("A ZIP archive with this name already exists in this folder.");
      return;
    }

    const zipItem: VirtualItem = {
      id: "zip-" + Math.random().toString(36).substr(2, 9),
      name: archiveName,
      type: "file",
      parentId: currentFolderId,
      size: Math.floor(Math.random() * 45000) + 1200,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      content: "SIMULATED BINARY ARCHIVE ZIP COMPRESSION WRAPPER",
      permissions: "0644"
    };

    setFiles(prev => [...prev, zipItem]);
    addActivity("file", `Compressed folder structure into archive: ${archiveName}`);
  };

  // Simulated unzip extraction
  const extractZipArchive = (item: VirtualItem) => {
    const targetDirName = item.name.replace(".zip", "") + "_extracted";
    
    // Create extracted folder
    const targetFolderId = "dir-" + Math.random().toString(36).substr(2, 9);
    const targetFolder: VirtualItem = {
      id: targetFolderId,
      name: targetDirName,
      type: "directory",
      parentId: currentFolderId,
      size: 4096,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      permissions: "0755"
    };

    // Create a dummy file inside the extracted folder
    const innerFile: VirtualItem = {
      id: "file-" + Math.random().toString(36).substr(2, 9),
      name: "README_extracted.txt",
      type: "file",
      parentId: targetFolderId,
      size: 245,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      content: `Archive extracted successfully!\n\nSource: ${item.name}\nTimestamp: ${new Date().toISOString()}`,
      permissions: "0644"
    };

    setFiles(prev => [...prev, targetFolder, innerFile]);
    addActivity("file", `Extracted ZIP archive contents into: ${targetDirName}/`);
    alert(`Archive "${item.name}" extracted successfully into folder "${targetDirName}/"`);
  };

  // Delete item
  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      setFiles(prev => prev.filter(f => f.id !== id && f.parentId !== id)); 
      addActivity("file", `Deleted virtual path resource: "${name}"`);
    }
  };

  // Start Editing
  const openEditor = (file: VirtualItem) => {
    setEditingFile(file);
    setEditorContent(file.content || "");
  };

  // Save File content
  const handleSaveFile = () => {
    if (!editingFile) return;
    
    setFiles(prev => prev.map(f => {
      if (f.id === editingFile.id) {
         return {
           ...f,
           content: editorContent,
           size: new Blob([editorContent]).size,
           updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
         };
      }
      return f;
    }));

    addActivity("file", `Saved modifications to server code file: ${editingFile.name}`);
    setEditingFile(prev => prev ? { ...prev, content: editorContent } : null);
    
    const saveNotif = document.getElementById("editor-save-notif");
    if (saveNotif) {
      saveNotif.classList.remove("opacity-0");
      saveNotif.classList.add("opacity-100");
      setTimeout(() => {
        saveNotif.classList.remove("opacity-100");
        saveNotif.classList.add("opacity-0");
      }, 2000);
    }
  };

  // Drag & Drop
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string || "";
        const newFile: VirtualItem = {
          id: "file-" + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: "file",
          parentId: currentFolderId,
          size: file.size,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          content: text,
          permissions: "0644"
        };
        setFiles(prev => [...prev, newFile]);
        addActivity("file", `Uploaded code file: ${file.name} to server`);
      };
      reader.readAsText(file);
    }
  };

  const handleManualUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string || "";
        const newFile: VirtualItem = {
          id: "file-" + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: "file",
          parentId: currentFolderId,
          size: file.size,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          content: text,
          permissions: "0644"
        };
        setFiles(prev => [...prev, newFile]);
        addActivity("file", `Uploaded code file: ${file.name} to server`);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Full Page Navigation Header Bar - DISTRACTION-FREE & IMMERSIVE */}
      <div className="bg-slate-900 border border-slate-700 p-4 rounded flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-indigo-950/50 border border-indigo-700/40 rounded flex items-center justify-center shrink-0 shadow-inner">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                tPanel Web File Manager Pro
              </h1>
              <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/25">
                MAXIMIZED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Simulated Node environment directory path: <code className="text-indigo-400 font-semibold font-mono">/home/tpanel/public_html</code>
            </p>
          </div>
        </div>
        
        {/* Navigation Quick Jumps & Back Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("databases")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            MySQL
          </button>
          <button 
            onClick={() => setActiveTab("node")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            Node Apps
          </button>
          <button 
            onClick={() => setActiveTab("domains")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Domains
          </button>
          <button 
            onClick={() => setActiveTab("dashboard")}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold font-sans tracking-tight transition flex items-center gap-1.5 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/15"
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-200" />
            Exit Full Screen
          </button>
        </div>
      </div>

      {/* Multiselect Batch Action Bar (DOCK AT TOP IF SELECTED) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 p-3 rounded flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1 px-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              Selected: <strong className="text-white bg-indigo-505 px-2 py-0.5 rounded text-indigo-400">{selectedIds.length}</strong> resources
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={handleBulkCompress}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-505 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileArchive className="w-3.5 h-3.5 text-indigo-200" />
              Compress to .zip
            </button>
            <button 
              onClick={handleBulkCopy}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Copy Selected
            </button>
            <button 
              onClick={handleBulkCut}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5 rotate-45 text-slate-400" />
              Cut Selected
            </button>
            <button 
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-rose-900/50 hover:bg-rose-800/80 text-rose-300 border border-rose-800 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Selected
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-slate-400 hover:text-indigo-455 rounded text-xs transition font-mono border border-transparent hover:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clipboard Active Notification */}
      {clipBoardIds.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded flex items-center justify-between">
          <p className="text-xs text-amber-500 font-mono flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-400 animate-pulse" />
            Clipboard contains <strong>{clipBoardIds.length}</strong> items in <strong>{clipBoardMode.toUpperCase()}</strong> state.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handlePasteClipboard}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Paste in here
            </button>
            <button 
              onClick={() => setClipBoardIds([])}
              className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              title="Clear Clipboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700 p-4 rounded">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsNewFolderModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 hover:text-indigo-400 transition flex items-center gap-2 cursor-pointer"
            id="btn-create-folder"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            New Folder
          </button>
          <button 
            onClick={() => setIsNewFileModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/35 transition flex items-center gap-2 cursor-pointer shadow-sm"
            id="btn-create-file"
          >
            <FilePlus className="w-4 h-4 text-indigo-200" />
            New File
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Total Path Elements: <strong className="text-indigo-400 font-black">{files.length}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation & Files Area */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Breadcrumbs & Search Utility */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-700 p-3 rounded">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm text-slate-200 py-1 no-scrollbar">
              {getCurrentFolder().parentId && (
                <button 
                  onClick={() => setCurrentFolderId(getCurrentFolder().parentId!)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 transition cursor-pointer"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                  <button 
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`hover:text-indigo-400 font-mono transition text-xs px-2 py-0.5 rounded border border-slate-725 ${crumb.id === currentFolderId ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/40 font-bold" : "border-slate-800 text-slate-300 bg-slate-950/40"}`}
                  >
                    {crumb.name === "/" ? "root" : crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* In-Folder Search */}
            <div className="relative shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text" 
                placeholder="Filter files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Directory Listings container */}
          <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
            <p className="px-4 py-2 bg-slate-950 text-[10px] text-slate-400 font-mono border-b border-slate-800">
              💡 Hint: Right-click on any row item for detailed server commands (Copy, Extract, Compressions)!
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="bg-slate-950 text-slate-300 text-xs font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAllToggle}
                        className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-indigo-500 cursor-pointer w-4 h-4 ml-0.5"
                        title="Select/deselect all items"
                      />
                    </th>
                    <th className="py-3 px-4 text-slate-100">File Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell font-mono text-slate-300">Last Modified</th>
                    <th className="py-3 px-4 hidden md:table-cell font-mono text-slate-300">Chmod</th>
                    <th className="py-3 px-4 hidden md:table-cell font-mono text-slate-300">Size</th>
                    <th className="py-3 px-4 text-right text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80 text-xs">
                  
                  {/* Up directory row */}
                  {getCurrentFolder().parentId && (
                    <tr 
                      onClick={() => setCurrentFolderId(getCurrentFolder().parentId!)}
                      className="hover:bg-slate-800/45 cursor-pointer text-indigo-400/90 transition border-b border-slate-700/50"
                    >
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 font-mono font-bold flex items-center gap-3">
                        <FolderUp className="w-5 h-5 text-indigo-400 shrink-0" />
                        .. (Go Up)
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell font-mono">-</td>
                      <td className="py-3 px-4 hidden md:table-cell font-mono">-</td>
                      <td className="py-3 px-4 hidden md:table-cell font-mono">-</td>
                      <td className="py-3 px-4 text-right"></td>
                    </tr>
                  )}

                  {/* Filtered files list */}
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                           <Inbox className="w-8 h-8 text-indigo-400/30 animate-pulse" />
                        <p className="text-xs font-semibold text-slate-100 font-mono">Empty Directory</p>
                           <p className="text-[11px] text-slate-500 font-mono">Create folders &amp; files above or select file to upload.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isZip = item.name.endsWith(".zip");
                      const perms = item.permissions || (item.type === "directory" ? "0755" : "0644");
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr 
                          key={item.id}
                          onContextMenu={(e) => handleContextMenuTrigger(e, item)}
                          className={`hover:bg-indigo-600/5 transition group cursor-pointer border-b border-slate-700/50 ${isSelected ? "bg-indigo-600/10 text-slate-100 font-bold" : "text-slate-300"}`}
                          onClick={() => {
                            if (item.type === "directory") {
                              setCurrentFolderId(item.id);
                              setSearchQuery("");
                            } else {
                              openEditor(item);
                            }
                          }}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => handleRowCheckboxToggle(e, item.id)}
                              className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono flex items-center gap-2.5 font-bold text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            <span className="shrink-0 group-hover:scale-110 transition">
                              {getItemIcon(item)}
                            </span>
                            <span className="truncate max-w-[180px] sm:max-w-[420px]">{item.name}</span>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-400">
                            {item.updatedAt}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                openChmodModal(item);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] border border-slate-755 hover:border-indigo-500 hover:text-white text-slate-300 cursor-pointer transition inline-flex items-center gap-1 font-semibold"
                              title="Click to modify permissions (chmod)"
                            >
                              <Shield className="w-3 h-3 text-slate-500" />
                              {perms}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                            {item.type === "directory" ? "DIR" : `${(item.size).toLocaleString()} B`}
                          </td>
                          <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              
                              {/* Compress action */}
                              <button
                                onClick={() => compressToZip(item)}
                                className="p-1 px-[5px] text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded transition border border-transparent hover:border-slate-700"
                                title="Compress to ZIP"
                              >
                                <FolderArchive className="w-3.5 h-3.5 text-amber-500/80" />
                              </button>

                              {/* Unzip action if ZIP */}
                              {isZip && (
                                <button
                                  onClick={() => extractZipArchive(item)}
                                  className="p-1 px-[5px] text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition border border-transparent hover:border-slate-705"
                                  title="Extract ZIP contents"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                                </button>
                              )}

                              {item.type === "file" && (
                                <>
                                  <button
                                    onClick={() => triggerPhysicalDownload(item)}
                                    className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                                    title="Download raw file"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => openEditor(item)}
                                    className="p-1 text-slate-400 hover:text-sky-455 hover:bg-slate-800 rounded transition"
                                    title="Edit code source"
                                    id={`btn-edit-${item.id}`}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button 
                                onClick={() => openRenameModal(item)}
                                className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition"
                                title="Rename item"
                              >
                                <Tag className="w-3.5 h-3.5 text-purple-400/80" />
                              </button>

                              <button 
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1 text-slate-400 hover:text-rose-455 hover:bg-slate-800 rounded transition"
                                title="Delete"
                                id={`btn-delete-${item.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                </tbody>
              </table>
            </div>
          </div>

          {/* Simple drag and drop code uploader */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer border border-dashed rounded p-5 transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
              dragActive 
                ? "border-indigo-500 bg-indigo-500/10" 
                : "border-slate-700 bg-slate-900/15 hover:bg-slate-900/30 hover:border-slate-500"
            }`}
          >
            <Upload className={`w-7 h-7 ${dragActive ? "text-indigo-400 animate-bounce" : "text-slate-500"}`} />
            <p className="text-xs font-bold text-slate-300">
              Drag &amp; drop file to upload physically
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Will write into <code className="text-indigo-455 font-mono">{getCurrentFolder().name === "/" ? "root_document" : getCurrentFolder().name}</code> folder
            </p>
            <label className="mt-1 text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold px-2.5 py-1.5 rounded border border-slate-700 cursor-pointer transition">
              Choose Local File
              <input 
                type="file" 
                className="hidden" 
                onChange={handleManualUpload} 
              />
            </label>
          </div>

        </div>

        {/* File Manager Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Dev Quick Tips
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Double click or select folders to navigate. Check the checkboxes to invoke <strong>Batch Actions</strong> like mass compressing or bulk deleting items! 
            </p>

            <div className="border-t border-slate-750 pt-3 space-y-2.5">
              <p className="text-xs font-semibold text-slate-300 font-mono">Ask Copilot smart boilerplates:</p>
              <button 
                onClick={() => openAiWithPrompt("Create a complete Node.js Express server template that responds to JSON GET requests")}
                className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[10px] text-sky-400 font-mono transition block leading-normal cursor-pointer"
              >
                + Node Express Boilerplate
              </button>
              <button 
                onClick={() => openAiWithPrompt("Create a beautiful responsive modern web HTML starter landing page styled with neat CSS styles")}
                className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[10px] text-sky-400 font-mono transition block leading-normal cursor-pointer"
              >
                + Modern HTML Landing Page
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT-CLICK ABSOLUTE CONTEXT MENU DOCK */}
      {contextMenu && (
        <>
          {/* Backdrop layer to capture window clicks comfortably inside iframe preview */}
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div 
            className="fixed z-50 bg-slate-950 border border-slate-700 shadow-2xl rounded p-1 w-52 text-xs font-mono font-bold divide-y divide-slate-805"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 240)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Context Actions Container */}
            <div className="py-1 space-y-0.5">
              <div className="px-3 py-1 text-[9px] text-slate-550 uppercase tracking-widest text-slate-500 font-black">
                Server Actions
              </div>
              {contextMenu.item.type === "directory" ? (
                <button 
                  onClick={() => {
                    setCurrentFolderId(contextMenu.item.id);
                    setSearchQuery("");
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Enter directory
                </button>
              ) : (
                <button 
                  onClick={() => {
                    openEditor(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
                >
                  <Edit className="w-3.5 h-3.5 text-sky-450" />
                  Edit code source
                </button>
              )}
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`/home/tpanel/public_html/${contextMenu.item.name}`)
                    .then(() => alert(`Copied full path to system clipboard!`))
                    .catch(() => alert(`Resource path: /home/tpanel/public_html/${contextMenu.item.name}`));
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copy absolute path
              </button>
            </div>

            <div className="py-1 space-y-0.5">
              <button 
                onClick={() => {
                  compressToZip(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                Compress into (.zip)
              </button>
              
              {contextMenu.item.name.endsWith(".zip") && (
                <button 
                  onClick={() => {
                    extractZipArchive(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-emerald-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-emerald-400 font-bold"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  Extract Zip archive
                </button>
              )}

              <button 
                onClick={() => {
                  openRenameModal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                Rename resource
              </button>
            </div>

            <div className="py-1 space-y-0.5">
              <button 
                onClick={() => {
                  openChmodModal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                Chmod Permissions
              </button>

              <button 
                onClick={() => {
                  handleDeleteItem(contextMenu.item.id, contextMenu.item.name);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-600 hover:text-white text-rose-455 rounded flex items-center gap-2 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Delete Resource
              </button>
            </div>
          </div>
        </>
      )}

      {/* CHMOD PERMISSIONS MODAL */}
      {isChmodModalOpen && itemToChmod && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-md shadow-xl space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <Shield className="w-4 h-4 text-sky-400" />
                Change Linux Permissions (chmod)
              </h3>
              <button 
                type="button"
                onClick={() => { setIsChmodModalOpen(false); setItemToChmod(null); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modifying server flags for <span className="font-mono text-amber-500 font-black">{itemToChmod.name}</span>:
            </p>

            <div className="grid grid-cols-3 gap-4 border border-slate-700 p-4 rounded bg-slate-950 font-mono text-xs">
              {/* User Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Owner</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserRead} onChange={(e) => setPermUserRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserWrite} onChange={(e) => setPermUserWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserExec} onChange={(e) => setPermUserExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>

              {/* Group Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Group</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupRead} onChange={(e) => setPermGroupRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupWrite} onChange={(e) => setPermGroupWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupExec} onChange={(e) => setPermGroupExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>

              {/* World Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">World</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldRead} onChange={(e) => setPermWorldRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldWrite} onChange={(e) => setPermWorldWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldExec} onChange={(e) => setPermWorldExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
              <span className="text-xs text-slate-400">Equivalent Octal Code:</span>
              <span className="text-sm font-bold text-indigo-400">{getCalculatedOctal()}</span>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => { setIsChmodModalOpen(false); setItemToChmod(null); }}
                className="px-3 py-1.5 text-xs text-slate-450 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveChmod}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition cursor-pointer"
              >
                Save Flags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {isRenameModalOpen && itemToRename && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveRename}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <Tag className="w-4 h-4 text-purple-400" />
                Rename Resource
              </h3>
              <button 
                type="button"
                onClick={() => { setIsRenameModalOpen(false); setItemToRename(null); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs text-slate-450 block font-semibold">Enter New Name</label>
              <input 
                type="text" 
                required
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsRenameModalOpen(false); setItemToRename(null); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Embedded File Editor Panel */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]">
            
            {/* Editor Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200 font-mono">{editingFile.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Path: /{!getBreadcrumbs().map(b=>b.name === "/" ? "" : b.name).filter(Boolean).join("/")}/{editingFile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span id="editor-save-notif" className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 opacity-0 transition-opacity duration-300">
                  Saved successfully!
                </span>
                <button 
                  onClick={handleSaveFile}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 cursor-pointer border border-transparent"
                  id="btn-save-editor"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditingFile(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
                  id="btn-close-editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editing Textarea */}
            <div className="flex-1 overflow-hidden flex relative font-mono text-xs">
              <div className="hidden sm:block bg-slate-950 border-r border-slate-800 text-slate-600 text-right select-none py-4 px-3 w-12/100 overflow-hidden leading-[1.6]">
                {Array.from({ length: Math.max(15, editorContent.split("\n").length + 2) }).map((_, i) => (
                  <div key={i} className="leading-relaxed">{i + 1}</div>
                ))}
              </div>
              <textarea 
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck={false}
                placeholder="Write codes here..."
                className="flex-1 bg-slate-950/80 p-4 text-slate-200 leading-relaxed font-mono focus:outline-none resize-none overflow-y-auto block select-text focus:bg-slate-950"
              />
            </div>

            {/* Footer status bar */}
            <div className="bg-slate-900 border-t border-slate-700 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <div>Size: {editorContent.length} chars ({(new Blob([editorContent]).size)} Bytes)</div>
              <div>Syntax Code editor (UTF-8)</div>
            </div>

          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateFolder}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                Create Folder
              </h3>
              <button 
                type="button"
                onClick={() => { setIsNewFolderModalOpen(false); setNewItemName(""); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="Folder Name (e.g. static, api_v1)" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsNewFolderModalOpen(false); setNewItemName(""); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateFile}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <FilePlus className="w-4 h-4 text-indigo-400" />
                Create Empty File
              </h3>
              <button 
                type="button"
                onClick={() => { setIsNewFileModalOpen(false); setNewItemName(""); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="File name (e.g. app.js, index.php)" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsNewFileModalOpen(false); setNewItemName(""); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
