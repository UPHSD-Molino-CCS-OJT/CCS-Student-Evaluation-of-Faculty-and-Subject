import { Link, usePage } from '@inertiajs/react';
import { BarChart3, BookOpenText, ClipboardCheck, FileCheck, Users, UserCog } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;

    const mainNavItems: NavItem[] = (() => {
        if (auth.user.role === 'faculty') {
            return [
                {
                    title: 'Faculty Reports',
                    href: '/faculty/reports',
                    icon: BarChart3,
                },
            ];
        }

        if (['dean', 'staff', 'system_admin'].includes(auth.user.role)) {
            return [
                {
                    title: 'Evaluation Summary',
                    href: '/dean/summaries',
                    icon: BarChart3,
                },
                {
                    title: 'Courses per Program',
                    href: '/dean/program-courses',
                    icon: BookOpenText,
                },
                {
                    title: 'Students',
                    href: '/dean/students',
                    icon: Users,
                },
                {
                    title: 'Enrollments',
                    href: '/dean/enrollments',
                    icon: FileCheck,
                },
                {
                    title: 'Faculty Management',
                    href: '/dean/faculty-management',
                    icon: UserCog,
                },
            ];
        }

        return [
            {
                title: 'My Evaluations',
                href: '/student/evaluations',
                icon: ClipboardCheck,
            },
        ];
    })();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
