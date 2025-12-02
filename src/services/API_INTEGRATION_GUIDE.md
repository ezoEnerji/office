// Backend API Integration Helper
// Bu dosya, frontend'in backend API'ye nasıl bağlanacağını gösterir.

// Örnek: App.tsx içinde kullanım
/*
import { apiService } from './services/api';

// Login
const handleLogin = async (email: string, password: string) => {
  try {
    const { user, token } = await apiService.login(email, password);
    setCurrentUser(user);
    setIsAuthenticated(true);
    await loadDataFromBackend();
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Veri yükleme
const loadDataFromBackend = async () => {
  try {
    const [projects, companies, entities] = await Promise.all([
      apiService.getProjects(),
      apiService.getCompanies(),
      apiService.getEntities()
    ]);
    setProjects(projects);
    setCompanies(companies);
    setEntities(entities);
  } catch (error) {
    console.error('Data loading failed:', error);
  }
};

// Veri kaydetme
const handleSaveProject = async (projectData: any) => {
  try {
    if (editingProject) {
      await apiService.updateProject(editingProject.id, projectData);
    } else {
      await apiService.createProject(projectData);
    }
    await loadDataFromBackend(); // Yeniden yükle
  } catch (error) {
    console.error('Save failed:', error);
  }
};
*/

// Tüm API metodları src/services/api.ts dosyasında tanımlıdır.

