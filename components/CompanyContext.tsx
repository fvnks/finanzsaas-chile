
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company } from '../types';

interface CompanyContextType {
    activeCompany: Company | null;
    setActiveCompany: (company: Company) => void;
    availableCompanies: Company[];
    loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode, user: User | null }> = ({ children, user }) => {
    const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
    const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.companies && user.companies.length > 0) {
            setAvailableCompanies(user.companies);

            // Check localStorage first
            const savedCompanyId = localStorage.getItem('activeCompanyId');
            const savedCompany = user.companies.find(c => c.id === savedCompanyId);

            if (savedCompany) {
                setActiveCompanyState(savedCompany);
            } else if (user.activeCompanyId) {
                // Fallback to user's last active company from DB
                const dbCompany = user.companies.find(c => c.id === user.activeCompanyId);
                setActiveCompanyState(dbCompany || user.companies[0]);
            } else {
                // Fallback to first company
                setActiveCompanyState(user.companies[0]);
            }
        } else {
            setAvailableCompanies([]);
            setActiveCompanyState(null);
        }
        setLoading(false);
    }, [user]);

    const setActiveCompany = (company: Company) => {
        setActiveCompanyState(company);
        localStorage.setItem('activeCompanyId', company.id);
        // Optionally persist to backend here
    };

    return (
        <CompanyContext.Provider value={{ activeCompany, setActiveCompany, availableCompanies, loading }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
