// IndexedDB 工具类 - 用于存储大量数据
class IndexedDBManager {
  constructor(dbName = 'TopFlowDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建项目存储表
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 创建自动保存表
        if (!db.objectStoreNames.contains('autoSave')) {
          const autoSaveStore = db.createObjectStore('autoSave', { keyPath: 'id' });
          autoSaveStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // 保存项目数据
  async saveProject(projectData) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      const data = {
        ...projectData,
        timestamp: Date.now()
      };
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data.timestamp);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取项目数据
  async getProject(projectId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      
      const request = store.get(projectId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 删除项目
  async deleteProject(projectId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      const request = store.delete(projectId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取所有项目
  async getAllProjects() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const index = store.index('timestamp');
      
      const request = index.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 自动保存当前工作流
  async autoSaveWorkflow(workflowData) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['autoSave'], 'readwrite');
      const store = transaction.objectStore('autoSave');
      
      const data = {
        id: 'current-workflow',
        ...workflowData,
        timestamp: Date.now()
      };
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data.timestamp);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取自动保存的工作流
  async getAutoSavedWorkflow() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['autoSave'], 'readonly');
      const store = transaction.objectStore('autoSave');
      
      const request = store.get('current-workflow');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 清除自动保存数据
  async clearAutoSave() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['autoSave'], 'readwrite');
      const store = transaction.objectStore('autoSave');
      
      const request = store.delete('current-workflow');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取存储使用情况（估算）
  async getStorageUsage() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects', 'autoSave'], 'readonly');
      
      let totalSize = 0;
      let completedStores = 0;
      
      const calculateStoreSize = (store) => {
        return new Promise((resolveStore) => {
          const request = store.getAll();
          request.onsuccess = () => {
            const data = JSON.stringify(request.result);
            totalSize += new Blob([data]).size;
            completedStores++;
            
            if (completedStores === 2) {
              resolve(totalSize);
            }
            resolveStore();
          };
          request.onerror = () => {
            completedStores++;
            if (completedStores === 2) {
              resolve(totalSize);
            }
            resolveStore();
          };
        });
      };
      
      calculateStoreSize(transaction.objectStore('projects'));
      calculateStoreSize(transaction.objectStore('autoSave'));
    });
  }

  // 检查浏览器是否支持 IndexedDB
  static isSupported() {
    return 'indexedDB' in window;
  }
}

// 创建全局实例
export const indexedDBManager = new IndexedDBManager();

// 默认导出
export default indexedDBManager;