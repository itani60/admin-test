/**
 * Enhanced Business Analytics Data and PDF Generation
 * Modern, professional PDF reports with advanced formatting
 */

class AnalyticsDataGenerator {
    constructor() {
        this.primaryColor = [0, 123, 255]; // Blue
        this.successColor = [40, 167, 69]; // Green
        this.dangerColor = [220, 53, 69]; // Red
        this.warningColor = [255, 193, 7]; // Yellow
        this.infoColor = [23, 162, 184]; // Cyan
        this.darkColor = [52, 58, 64]; // Dark Gray
    }

    /**
     * Generate comprehensive analytics data
     */
    generateAnalyticsData() {
        return {
            timestamp: new Date().toISOString(),
            businessName: "TechHub Electronics Store",
            businessType: "Electronics & Technology",
            location: "Cape Town, South Africa",
            establishedDate: "2020-01-15",
            
            // Key Performance Metrics
            metrics: {
                profileViews: 2847,
                inquiries: 156,
                averageRating: 4.8,
                favorites: 89,
                conversionRate: 12.5,
                responseTime: "2.3 hours",
                customerSatisfaction: 94.2
            },
            
            // Growth Trends
            trends: {
                profileViewsChange: "+12%",
                inquiriesChange: "+8%",
                ratingChange: "+0.2",
                favoritesChange: "+15%",
                conversionRateChange: "+3.2%",
                responseTimeChange: "-15 min",
                satisfactionChange: "+2.1%"
            },
            
            // Popular Services with enhanced data
            popularServices: [
                { 
                    name: "Custom Birthday Cards", 
                    views: 247, 
                    inquiries: 23,
                    conversion: 9.3,
                    revenue: 1840,
                    change: "+23",
                    category: "Custom Design"
                },
                { 
                    name: "Personalized Photo Frames", 
                    views: 189, 
                    inquiries: 18,
                    conversion: 9.5,
                    revenue: 1420,
                    change: "+18",
                    category: "Personalization"
                },
                { 
                    name: "Virtual Invitations", 
                    views: 156, 
                    inquiries: 15,
                    conversion: 9.6,
                    revenue: 980,
                    change: "+31",
                    category: "Digital Services"
                },
                { 
                    name: "Kids Party Packs", 
                    views: 134, 
                    inquiries: 12,
                    conversion: 9.0,
                    revenue: 760,
                    change: "+12",
                    category: "Event Planning"
                }
            ],
            
            // Enhanced Customer Insights
            customerInsights: {
                peakHours: "2:00 PM - 6:00 PM",
                busiestDays: "Monday & Friday",
                topLocation: "Cape Town Area",
                averageOrderValue: 156.80,
                repeatCustomerRate: 34.2,
                customerLifetimeValue: 890.50
            },
            
            // Detailed Inquiry Sources
            inquirySources: {
                whatsapp: { percentage: "45%", inquiries: 70, conversion: 14.2 },
                phone: { percentage: "30%", inquiries: 47, conversion: 12.8 },
                instagram: { percentage: "15%", inquiries: 23, conversion: 8.7 },
                email: { percentage: "10%", inquiries: 16, conversion: 6.2 }
            },
            
            // Revenue Analytics
            revenue: {
                totalMonthly: 15420.50,
                averageDaily: 497.43,
                topRevenueService: "Custom Birthday Cards",
                growthRate: "+18.5%",
                profitMargin: 68.2
            },
            
            // Geographic Data
            geographic: {
                topRegions: [
                    { region: "Cape Town", percentage: 45, customers: 89 },
                    { region: "Johannesburg", percentage: 28, customers: 56 },
                    { region: "Durban", percentage: 15, customers: 30 },
                    { region: "Pretoria", percentage: 12, customers: 24 }
                ]
            },
            
            // Performance Indicators
            performance: {
                websiteLoadTime: "1.2s",
                mobileOptimization: "98%",
                socialMediaEngagement: "4.2%",
                emailOpenRate: "24.8%",
                customerRetention: "78.5%"
            }
        };
    }

    /**
     * Generate monthly report data
     */
    generateMonthlyReportData(monthYear) {
        const [year, month] = monthYear.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        const baseData = this.generateAnalyticsData();
        
        return {
            ...baseData,
            month: monthNames[parseInt(month) - 1],
            year: year,
            monthlyMetrics: {
                totalProfileViews: Math.floor(Math.random() * 5000) + 2000,
                totalInquiries: Math.floor(Math.random() * 300) + 100,
                averageRating: (Math.random() * 1 + 4).toFixed(1),
                totalFavorites: Math.floor(Math.random() * 200) + 50,
                newCustomers: Math.floor(Math.random() * 100) + 20,
                revenue: Math.floor(Math.random() * 50000) + 10000,
                ordersCompleted: Math.floor(Math.random() * 150) + 50,
                customerSatisfaction: (Math.random() * 10 + 85).toFixed(1)
            }
        };
    }

    /**
     * Enhanced PDF Generation with Modern Design
     */
    generateAnalyticsPDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        let yPosition = 20;
        
        // Modern Header with Gradient Effect
        this.addHeader(doc, data, yPosition);
        yPosition = 45;
        
        // Executive Summary
        yPosition = this.addExecutiveSummary(doc, data, yPosition);
        
        // Key Metrics Dashboard
        yPosition = this.addKeyMetricsDashboard(doc, data, yPosition);
        
        // Performance Trends
        yPosition = this.addPerformanceTrends(doc, data, yPosition);
        
        // Revenue Analytics
        yPosition = this.addRevenueAnalytics(doc, data, yPosition);
        
        // Customer Insights
        yPosition = this.addCustomerInsights(doc, data, yPosition);
        
        // Service Performance
        yPosition = this.addServicePerformance(doc, data, yPosition);
        
        // Geographic Distribution
        yPosition = this.addGeographicDistribution(doc, data, yPosition);
        
        // Inquiry Sources Analysis
        yPosition = this.addInquirySourcesAnalysis(doc, data, yPosition);
        
        // Recommendations
        this.addRecommendations(doc, data, yPosition);
        
        // Footer
        this.addFooter(doc);
        
        // Save the PDF
        const fileName = `business-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }

    /**
     * Generate Monthly Report PDF
     */
    generateMonthlyReportPDF(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        let yPosition = 20;
        
        // Monthly Report Header
        this.addMonthlyHeader(doc, data, yPosition);
        yPosition = 45;
        
        // Monthly Summary
        yPosition = this.addMonthlySummary(doc, data, yPosition);
        
        // Monthly Metrics
        yPosition = this.addMonthlyMetrics(doc, data, yPosition);
        
        // Service Performance
        yPosition = this.addServicePerformance(doc, data, yPosition);
        
        // Customer Analysis
        yPosition = this.addCustomerAnalysis(doc, data, yPosition);
        
        // Revenue Breakdown
        yPosition = this.addRevenueBreakdown(doc, data, yPosition);
        
        // Monthly Recommendations
        this.addMonthlyRecommendations(doc, data, yPosition);
        
        // Footer
        this.addFooter(doc);
        
        // Save the PDF
        const fileName = `monthly-report-${data.year}-${data.month.toLowerCase()}.pdf`;
        doc.save(fileName);
    }

    /**
     * Add Modern Header
     */
    addHeader(doc, data, yPosition) {
        // Background rectangle
        doc.setFillColor(...this.primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Business Analytics Report', 20, 18);
        
        // Subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.businessName, 20, 25);
        
        // Date and location
        doc.text(`Generated: ${new Date(data.timestamp).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`, 20, 30);
        
        doc.text(data.location, 140, 30);
    }

    /**
     * Add Executive Summary
     */
    addExecutiveSummary(doc, data, yPosition) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const summary = `This report provides a comprehensive analysis of ${data.businessName}'s performance. 
        Key highlights include ${data.metrics.profileViews.toLocaleString()} profile views, ${data.metrics.inquiries} inquiries, 
        and a ${data.metrics.averageRating}/5.0 customer rating. The business shows strong growth with 
        ${data.trends.profileViewsChange} increase in profile views and ${data.trends.inquiriesChange} growth in inquiries.`;
        
        const lines = doc.splitTextToSize(summary, 170);
        doc.text(lines, 20, yPosition);
        
        return yPosition + (lines.length * 5) + 10;
    }

    /**
     * Add Key Metrics Dashboard
     */
    addKeyMetricsDashboard(doc, data, yPosition) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Performance Metrics', 20, yPosition);
        yPosition += 10;
        
        const metrics = [
            ['Profile Views', data.metrics.profileViews, data.trends.profileViewsChange, this.primaryColor],
            ['Inquiries', data.metrics.inquiries, data.trends.inquiriesChange, this.successColor],
            ['Avg Rating', data.metrics.averageRating, data.trends.ratingChange, this.warningColor],
            ['Favorites', data.metrics.favorites, data.trends.favoritesChange, this.dangerColor],
            ['Conversion Rate', data.metrics.conversionRate + '%', data.trends.conversionRateChange, this.infoColor],
            ['Response Time', data.metrics.responseTime, data.trends.responseTimeChange, this.darkColor]
        ];
        
        metrics.forEach(([metric, value, change, color]) => {
            // Metric box
            doc.setFillColor(...color);
            doc.rect(20, yPosition - 5, 80, 12, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(metric, 25, yPosition + 2);
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text(`${value}`, 105, yPosition + 2);
            doc.setTextColor(...this.successColor);
            doc.text(`${change}`, 160, yPosition + 2);
            
            yPosition += 15;
        });
        
        return yPosition + 5;
    }

    /**
     * Add Performance Trends
     */
    addPerformanceTrends(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Performance Trends', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const trends = [
            ['Customer Satisfaction', data.metrics.customerSatisfaction + '%', data.trends.satisfactionChange],
            ['Mobile Optimization', data.performance.mobileOptimization, '+2.1%'],
            ['Social Media Engagement', data.performance.socialMediaEngagement, '+0.8%'],
            ['Customer Retention', data.performance.customerRetention, '+3.2%']
        ];
        
        trends.forEach(([trend, value, change]) => {
            doc.text(`${trend}: ${value}`, 25, yPosition);
            doc.setTextColor(...this.successColor);
            doc.text(`${change}`, 150, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Revenue Analytics
     */
    addRevenueAnalytics(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Revenue Analytics', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const revenueData = [
            ['Total Monthly Revenue', `R${data.revenue.totalMonthly.toLocaleString()}`],
            ['Average Daily Revenue', `R${data.revenue.averageDaily.toFixed(2)}`],
            ['Top Revenue Service', data.revenue.topRevenueService],
            ['Revenue Growth Rate', data.revenue.growthRate],
            ['Profit Margin', data.revenue.profitMargin + '%']
        ];
        
        revenueData.forEach(([label, value]) => {
            doc.text(`${label}: ${value}`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Customer Insights
     */
    addCustomerInsights(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Insights', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const insights = [
            ['Peak Hours', data.customerInsights.peakHours],
            ['Busiest Days', data.customerInsights.busiestDays],
            ['Top Location', data.customerInsights.topLocation],
            ['Average Order Value', `R${data.customerInsights.averageOrderValue}`],
            ['Repeat Customer Rate', data.customerInsights.repeatCustomerRate + '%'],
            ['Customer Lifetime Value', `R${data.customerInsights.customerLifetimeValue}`]
        ];
        
        insights.forEach(([insight, value]) => {
            doc.text(`${insight}: ${value}`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Service Performance
     */
    addServicePerformance(doc, data, yPosition) {
        if (yPosition > 180) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Service Performance', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        data.popularServices.forEach((service, index) => {
            doc.setTextColor(0, 0, 0);
            doc.text(`${index + 1}. ${service.name}`, 25, yPosition);
            doc.text(`Views: ${service.views} | Inquiries: ${service.inquiries} | Revenue: R${service.revenue}`, 25, yPosition + 5);
            doc.setTextColor(...this.successColor);
            doc.text(`Growth: ${service.change}`, 150, yPosition + 2);
            yPosition += 12;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Geographic Distribution
     */
    addGeographicDistribution(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Geographic Distribution', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        data.geographic.topRegions.forEach(region => {
            doc.text(`${region.region}: ${region.percentage}% (${region.customers} customers)`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Inquiry Sources Analysis
     */
    addInquirySourcesAnalysis(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Inquiry Sources Analysis', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        Object.entries(data.inquirySources).forEach(([source, data]) => {
            const sourceName = source.charAt(0).toUpperCase() + source.slice(1);
            doc.text(`${sourceName}: ${data.percentage}`, 25, yPosition);
            doc.text(`Inquiries: ${data.inquiries} | Conversion: ${data.conversion}%`, 80, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Recommendations
     */
    addRecommendations(doc, data, yPosition) {
        if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Strategic Recommendations', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const recommendations = [
            "Focus on WhatsApp marketing as it generates 45% of inquiries with high conversion rates",
            "Optimize services during peak hours (2-6 PM) for maximum customer engagement",
            "Expand virtual invitation services showing strong growth (+31% this week)",
            "Improve email marketing conversion rates through better targeting",
            "Consider expanding to Johannesburg market with 28% geographic interest",
            "Implement customer retention programs to increase repeat business"
        ];
        
        recommendations.forEach((rec, index) => {
            doc.text(`${index + 1}. ${rec}`, 25, yPosition);
            yPosition += 12;
        });
        
        return yPosition;
    }

    /**
     * Add Monthly Report Header
     */
    addMonthlyHeader(doc, data, yPosition) {
        doc.setFillColor(...this.primaryColor);
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`Monthly Report - ${data.month} ${data.year}`, 20, 18);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.businessName, 20, 25);
        doc.text(`Generated: ${new Date(data.timestamp).toLocaleDateString()}`, 20, 30);
    }

    /**
     * Add Monthly Summary
     */
    addMonthlySummary(doc, data, yPosition) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Summary', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const summary = `This monthly report covers ${data.month} ${data.year} performance for ${data.businessName}. 
        The business achieved strong results with ${data.monthlyMetrics.totalProfileViews.toLocaleString()} profile views, 
        ${data.monthlyMetrics.totalInquiries} inquiries, and R${data.monthlyMetrics.revenue.toLocaleString()} in revenue.`;
        
        const lines = doc.splitTextToSize(summary, 170);
        doc.text(lines, 20, yPosition);
        
        return yPosition + (lines.length * 5) + 10;
    }

    /**
     * Add Monthly Metrics
     */
    addMonthlyMetrics(doc, data, yPosition) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Metrics', 20, yPosition);
        yPosition += 10;
        
        const monthlyData = [
            ['Total Profile Views', data.monthlyMetrics.totalProfileViews.toLocaleString()],
            ['Total Inquiries', data.monthlyMetrics.totalInquiries],
            ['Average Rating', data.monthlyMetrics.averageRating + '/5.0'],
            ['New Customers', data.monthlyMetrics.newCustomers],
            ['Orders Completed', data.monthlyMetrics.ordersCompleted],
            ['Customer Satisfaction', data.monthlyMetrics.customerSatisfaction + '%'],
            ['Total Revenue', `R${data.monthlyMetrics.revenue.toLocaleString()}`]
        ];
        
        monthlyData.forEach(([metric, value]) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${metric}: ${value}`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Customer Analysis
     */
    addCustomerAnalysis(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Analysis', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const customerData = [
            ['Repeat Customer Rate', data.customerInsights.repeatCustomerRate + '%'],
            ['Average Order Value', `R${data.customerInsights.averageOrderValue}`],
            ['Customer Lifetime Value', `R${data.customerInsights.customerLifetimeValue}`],
            ['Peak Business Hours', data.customerInsights.peakHours],
            ['Most Active Days', data.customerInsights.busiestDays]
        ];
        
        customerData.forEach(([metric, value]) => {
            doc.text(`${metric}: ${value}`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Revenue Breakdown
     */
    addRevenueBreakdown(doc, data, yPosition) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Revenue Breakdown', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        data.popularServices.forEach(service => {
            doc.text(`${service.name}: R${service.revenue}`, 25, yPosition);
            yPosition += 8;
        });
        
        return yPosition + 10;
    }

    /**
     * Add Monthly Recommendations
     */
    addMonthlyRecommendations(doc, data, yPosition) {
        if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Recommendations', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const recommendations = [
            `Continue focusing on top-performing services like ${data.revenue.topRevenueService}`,
            "Maintain strong customer satisfaction levels through quality service delivery",
            "Explore opportunities to increase average order value",
            "Consider seasonal promotions during peak business periods",
            "Monitor and optimize inquiry response times for better conversion"
        ];
        
        recommendations.forEach((rec, index) => {
            doc.text(`${index + 1}. ${rec}`, 25, yPosition);
            yPosition += 12;
        });
        
        return yPosition;
    }

    /**
     * Add Professional Footer
     */
    addFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 280, 190, 280);
            
            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('Generated by CompareHubPrices Business Analytics', 20, 285);
            doc.text(`Page ${i} of ${pageCount}`, 170, 285);
            
            // Footer date
            doc.text(new Date().toLocaleDateString(), 95, 285);
        }
    }
}

// Global instance
window.analyticsDataGenerator = new AnalyticsDataGenerator();

// Export functions for backward compatibility
window.generateAnalyticsPDF = function(data) {
    window.analyticsDataGenerator.generateAnalyticsPDF(data);
};

window.generateMonthlyReportPDF = function(data) {
    window.analyticsDataGenerator.generateMonthlyReportPDF(data);
};

window.generateAnalyticsData = function() {
    return window.analyticsDataGenerator.generateAnalyticsData();
};

window.generateMonthlyReportData = function(monthYear) {
    return window.analyticsDataGenerator.generateMonthlyReportData(monthYear);
};











