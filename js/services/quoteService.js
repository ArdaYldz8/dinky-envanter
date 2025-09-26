// Quote Service
import { supabase } from './supabaseClient.js';

export const quoteService = {
    // Generate unique quote number
    async generateQuoteNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');

        // Get the last quote number for this month
        const { data, error } = await supabase
            .from('quotes')
            .select('quote_number')
            .like('quote_number', `TKL-${year}${month}-%`)
            .order('quote_number', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error generating quote number:', error);
            return `TKL-${year}${month}-001`;
        }

        if (data && data.length > 0) {
            const lastNumber = data[0].quote_number;
            const sequence = parseInt(lastNumber.split('-').pop()) + 1;
            return `TKL-${year}${month}-${String(sequence).padStart(3, '0')}`;
        }

        return `TKL-${year}${month}-001`;
    },

    // Create new quote
    async create(quoteData) {
        try {
            // Generate quote number
            const quoteNumber = await this.generateQuoteNumber();

            // Calculate totals
            const subtotal = quoteData.items.reduce((sum, item) => sum + item.line_total, 0);
            const taxRate = quoteData.tax_rate || 18;
            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            // Create quote
            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .insert([{
                    quote_number: quoteNumber,
                    customer_id: quoteData.customer_id,
                    customer_name: quoteData.customer_name,
                    customer_email: quoteData.customer_email,
                    customer_phone: quoteData.customer_phone,
                    customer_address: quoteData.customer_address,
                    quote_date: quoteData.quote_date || new Date().toISOString().split('T')[0],
                    valid_until: quoteData.valid_until,
                    status: quoteData.status || 'Taslak',
                    subtotal: subtotal,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    notes: quoteData.notes,
                    terms_conditions: quoteData.terms_conditions || this.getDefaultTerms()
                }])
                .select()
                .single();

            if (quoteError) throw quoteError;

            // Create quote items
            if (quoteData.items && quoteData.items.length > 0) {
                const items = quoteData.items.map(item => ({
                    quote_id: quote.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_code: item.product_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_rate: item.discount_rate || 0,
                    discount_amount: item.discount_amount || 0,
                    line_total: item.line_total,
                    unit: item.unit || 'Adet'
                }));

                const { error: itemsError } = await supabase
                    .from('quote_items')
                    .insert(items);

                if (itemsError) throw itemsError;
            }

            // Add status history
            await this.addStatusHistory(quote.id, null, 'Taslak', 'Teklif oluşturuldu');

            return { data: quote, error: null };
        } catch (error) {
            console.error('Error creating quote:', error);
            return { data: null, error };
        }
    },

    // Get all quotes
    async getAll() {
        const { data, error } = await supabase
            .from('quotes')
            .select(`
                *,
                customers (
                    id,
                    company_name,
                    contact_name
                ),
                quote_items (
                    *,
                    products (
                        product_name,
                        product_code
                    )
                )
            `)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    // Get single quote
    async getById(quoteId) {
        const { data, error } = await supabase
            .from('quotes')
            .select(`
                *,
                customers (
                    id,
                    company_name,
                    contact_name,
                    email,
                    phone,
                    address
                ),
                quote_items (
                    *,
                    products (
                        product_name,
                        product_code,
                        unit_price
                    )
                ),
                quote_status_history (
                    *
                )
            `)
            .eq('id', quoteId)
            .single();

        return { data, error };
    },

    // Update quote
    async update(quoteId, updates) {
        try {
            // If items are being updated, recalculate totals
            if (updates.items) {
                const subtotal = updates.items.reduce((sum, item) => sum + item.line_total, 0);
                const taxRate = updates.tax_rate || 18;
                const taxAmount = subtotal * (taxRate / 100);
                updates.subtotal = subtotal;
                updates.tax_amount = taxAmount;
                updates.total_amount = subtotal + taxAmount;

                // Delete old items
                await supabase
                    .from('quote_items')
                    .delete()
                    .eq('quote_id', quoteId);

                // Insert new items
                const items = updates.items.map(item => ({
                    quote_id: quoteId,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    product_code: item.product_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_rate: item.discount_rate || 0,
                    discount_amount: item.discount_amount || 0,
                    line_total: item.line_total,
                    unit: item.unit || 'Adet'
                }));

                await supabase
                    .from('quote_items')
                    .insert(items);

                // Remove items from updates to avoid SQL error
                delete updates.items;
            }

            // Update quote
            updates.updated_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('quotes')
                .update(updates)
                .eq('id', quoteId)
                .select()
                .single();

            return { data, error };
        } catch (error) {
            console.error('Error updating quote:', error);
            return { data: null, error };
        }
    },

    // Delete quote
    async delete(quoteId) {
        const { data, error } = await supabase
            .from('quotes')
            .delete()
            .eq('id', quoteId);

        return { data, error };
    },

    // Update quote status
    async updateStatus(quoteId, newStatus, notes = '') {
        try {
            // Get current status
            const { data: quote } = await supabase
                .from('quotes')
                .select('status')
                .eq('id', quoteId)
                .single();

            const oldStatus = quote?.status;

            // Update status
            const { error: updateError } = await supabase
                .from('quotes')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Add to history
            await this.addStatusHistory(quoteId, oldStatus, newStatus, notes);

            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    // Add status history
    async addStatusHistory(quoteId, oldStatus, newStatus, notes = '') {
        const { error } = await supabase
            .from('quote_status_history')
            .insert([{
                quote_id: quoteId,
                old_status: oldStatus,
                new_status: newStatus,
                notes: notes
            }]);

        return { error };
    },

    // Get quotes by status
    async getByStatus(status) {
        const { data, error } = await supabase
            .from('quotes')
            .select(`
                *,
                customers (
                    company_name
                )
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    // Get quotes by customer
    async getByCustomer(customerId) {
        const { data, error } = await supabase
            .from('quotes')
            .select(`
                *,
                quote_items (count)
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        return { data, error };
    },

    // Get default terms and conditions
    getDefaultTerms() {
        return `1. Bu teklif ${new Date().toLocaleDateString('tr-TR')} tarihinden itibaren 30 gün geçerlidir.
2. Fiyatlara KDV dahildir.
3. Ödeme vade süresi 30 gündür.
4. Teslimat süresi sipariş onayından sonra 7 iş günüdür.
5. İptal ve iade koşulları sözleşmede belirtilmiştir.`;
    }
};