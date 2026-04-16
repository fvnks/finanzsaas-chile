import { Company, User } from '../../types';
import { hasAnyPermission } from './permissions';

const TAB_PERMISSION_RESOURCES: Record<string, string[]> = {
    dashboard: ['dashboard'],
    invoices: ['invoices'],
    purchaseOrders: ['purchaseOrders'],
    expenses: ['expenses'],
    deliveries: ['deliveries'],
    tools: ['tools'],
    clients: ['clients'],
    suppliers: ['clients'],
    projects: ['projects'],
    workers: ['workers'],
    costCenters: ['costCenters'],
    crm: ['crm'],
    products: ['inventory'],
    warehouses: ['inventory'],
    cashFlow: ['cashFlow'],
    admin: ['admin'],
};

export const isTabEnabledByModules = (activeCompany: Company | null | undefined, tabId: string) => {
    const activeModules = activeCompany?.modules || ['INVOICING', 'PROJECTS', 'INVENTORY', 'TOOLS', 'HR'];

    if (tabId === 'crm') return activeModules.includes('INVOICING') || activeModules.includes('CRM');
    if (tabId === 'invoices' || tabId === 'costCenters' || tabId === 'cashFlow') return activeModules.includes('INVOICING');
    if (tabId === 'projects') return activeModules.includes('PROJECTS');
    if (tabId === 'tools') return activeModules.includes('TOOLS');
    if (tabId === 'deliveries' || tabId === 'workers') return activeModules.includes('HR');
    if (tabId === 'products' || tabId === 'warehouses') return activeModules.includes('INVENTORY');

    return true;
};

export const canAccessTab = (user: User | null, activeCompany: Company | null | undefined, tabId: string) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (!isTabEnabledByModules(activeCompany, tabId)) return false;

    const resources = TAB_PERMISSION_RESOURCES[tabId];
    if (!resources || resources.length === 0) return true;

    if ((user.allowedSections || []).includes(tabId)) return true;

    return resources.some(resource => hasAnyPermission(user, resource));
};
