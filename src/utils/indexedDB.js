// IndexedDB 工具类 - 用于存储大量数据
class IndexedDBManager {
  constructor(dbName = 'TopFlowDB') {
    this.dbName = dbName;
    this.version = null; // 动态获取版本号
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      // 动态获取当前数据库版本
      if (this.version === null) {
        const versionRequest = indexedDB.open(this.dbName);
        versionRequest.onsuccess = () => {
          const db = versionRequest.result;
          this.version = db.version || 1;
          db.close();
          // 使用正确的版本号重新初始化
          this.init().then(resolve).catch(reject);
        };
        versionRequest.onerror = () => {
          // 如果数据库不存在，使用版本1
          this.version = 1;
          this.init().then(resolve).catch(reject);
        };
        return;
      }
      
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = (event) => {
        console.error('IndexedDB打开失败:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        
        // 检查是否所有必要的对象存储都存在
        const hasProjects = this.db.objectStoreNames.contains('projects');
        const hasAutoSave = this.db.objectStoreNames.contains('autoSave');
        
        if (!hasProjects || !hasAutoSave) {
          // 如果缺少对象存储，需要升级数据库版本重新创建
          console.warn('缺少必要的对象存储，重新创建数据库...');
          this.db.close();
          this.version += 1;
          this.init().then(resolve).catch(reject);
          return;
        }
        
        console.log('IndexedDB初始化成功，版本:', this.version);
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 删除旧的对象存储（如果存在）
        if (db.objectStoreNames.contains('projects')) {
          db.deleteObjectStore('projects');
        }
        if (db.objectStoreNames.contains('autoSave')) {
          db.deleteObjectStore('autoSave');
        }
        
        // 创建项目存储表
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('timestamp', 'timestamp', { unique: false });
        
        // 创建自动保存表
        const autoSaveStore = db.createObjectStore('autoSave', { keyPath: 'id' });
        autoSaveStore.createIndex('timestamp', 'timestamp', { unique: false });
        
        console.log('IndexedDB升级完成，版本:', event.oldVersion, '→', event.newVersion);
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
    try {
      if (!this.db) await this.init();
      
      // 检查对象存储是否存在
      if (!this.db || !this.db.objectStoreNames.contains('autoSave')) {
        console.warn('autoSave 对象存储不存在，跳过自动保存');
        return null;
      }
      
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
        request.onerror = () => {
          console.warn('自动保存失败，对象存储可能已被删除');
          resolve(null); // 不reject，而是返回null
        };
      });
    } catch (error) {
      console.warn('自动保存初始化失败:', error);
      return null; // 捕获所有异常，返回null
    }
  }

  // 获取自动保存的工作流
  async getAutoSavedWorkflow() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      try {
        // 检查对象存储是否存在
        if (!this.db.objectStoreNames.contains('autoSave')) {
          resolve(null); // 对象存储不存在，返回null
          return;
        }
        
        const transaction = this.db.transaction(['autoSave'], 'readonly');
        const store = transaction.objectStore('autoSave');
        
        const request = store.get('current-workflow');
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('获取自动保存数据失败，可能对象存储不存在');
          resolve(null); // 出错时返回null而不是reject
        };
      } catch (error) {
        console.warn('IndexedDB操作失败:', error);
        resolve(null); // 捕获所有异常，返回null
      }
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