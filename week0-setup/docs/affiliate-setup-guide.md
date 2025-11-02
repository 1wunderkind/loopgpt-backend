# Affiliate Partner Setup Guide
## Week 0, Day 3: Affiliate Configuration

---

## ✅ What's Already Done

The `affiliate_partner_map` table has been created and seeded with initial data for:

### **United States (US)**
- **Grocery**: Amazon Fresh, Instacart, Walmart Grocery
- **Delivery**: MealMe, Uber Eats, DoorDash
- **Meal Kits**: HelloFresh, Factor

### **United Kingdom (GB)**
- **Grocery**: Tesco, Sainsbury's, Ocado
- **Delivery**: Uber Eats, Deliveroo, Just Eat

### **Canada (CA)**
- **Grocery**: Instacart, Walmart Grocery
- **Delivery**: Uber Eats, DoorDash, SkipTheDishes

---

## 📋 Next Steps: Sign Up for Affiliate Programs

### **Priority 1: Must Have for Launch**

#### 1. **MealMe** (Restaurant Delivery)
- **Why**: Highest commission (10%), aggregates all delivery platforms
- **Sign up**: https://mealme.ai/partners
- **Commission**: 5-15% per order
- **Coverage**: US nationwide
- **Integration**: API already built in `delivery_*` functions
- **Action**: Sign up and get affiliate ID

#### 2. **Amazon Associates** (Grocery)
- **Why**: Largest reach, trusted brand
- **Sign up**: https://affiliate-program.amazon.com
- **Commission**: 1-4% (varies by category)
- **Coverage**: US, UK, CA, DE, FR, IT, ES, JP, IN, AU
- **Action**: 
  - Sign up for US program
  - Get affiliate ID (format: `yourname-20`)
  - Apply for international programs separately

#### 3. **Instacart Affiliate** (Grocery)
- **Why**: Same-day delivery, wide coverage
- **Sign up**: https://www.instacart.com/partnerships
- **Commission**: 3-8% per order
- **Coverage**: US, CA
- **Action**: Contact partnerships team for affiliate program access

---

### **Priority 2: Nice to Have**

#### 4. **Uber Eats Affiliate**
- **Sign up**: https://www.uber.com/us/en/business/
- **Commission**: 5-12%
- **Note**: May require business account

#### 5. **DoorDash Affiliate**
- **Sign up**: https://get.doordash.com/en-us/affiliates
- **Commission**: 5-12%

#### 6. **HelloFresh Affiliate**
- **Sign up**: https://www.hellofresh.com/affiliates
- **Commission**: $10-20 per order
- **Note**: High commission, good for conversions

---

## 🔧 Configuration After Sign-Up

### Step 1: Update Affiliate IDs

Once you have affiliate IDs, update the database:

```sql
-- Update Amazon Fresh affiliate ID
UPDATE affiliate_partner_map
SET affiliate_id = 'YOUR_AMAZON_AFFILIATE_ID'
WHERE partner_name = 'Amazon Fresh';

-- Update MealMe affiliate ID
UPDATE affiliate_partner_map
SET affiliate_id = 'YOUR_MEALME_PARTNER_ID'
WHERE partner_name = 'MealMe';

-- Update Instacart affiliate ID
UPDATE affiliate_partner_map
SET affiliate_id = 'YOUR_INSTACART_AFFILIATE_ID'
WHERE partner_name = 'Instacart';

-- Repeat for each partner
```

### Step 2: Update Tracking Templates

Verify tracking templates match each partner's requirements:

```sql
-- Check current tracking templates
SELECT partner_name, tracking_template
FROM affiliate_partner_map
WHERE country_code = 'US';

-- Update if needed (example for Amazon)
UPDATE affiliate_partner_map
SET tracking_template = 'https://amazon.com/fresh?tag={affiliate_id}&ref={user_id}'
WHERE partner_name = 'Amazon Fresh';
```

### Step 3: Test Affiliate Links

```typescript
// Test script: test-affiliate-links.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function testAffiliateLinks() {
  // Get affiliates for US grocery
  const { data, error } = await supabase
    .rpc('get_affiliates_by_country', {
      p_country_code: 'US',
      p_category: 'grocery'
    });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('US Grocery Affiliates:');
  data.forEach((affiliate: any) => {
    console.log(`- ${affiliate.partner_name}`);
    console.log(`  URL: ${affiliate.tracking_url}`);
    console.log(`  Commission: ${affiliate.commission_rate}%`);
    console.log('');
  });
}

testAffiliateLinks();
```

---

## 🌍 Expanding to More Countries

### **Phase 2 Countries (Add After Launch)**

#### **Germany (DE)**
- **Grocery**: Rewe, Amazon Fresh DE, Edeka, Bringmeister
- **Delivery**: Uber Eats, Lieferando, Wolt
- **Meal Kits**: HelloFresh DE, Marley Spoon

#### **France (FR)**
- **Grocery**: Carrefour, Amazon Fresh FR, Monoprix
- **Delivery**: Uber Eats, Deliveroo, Just Eat FR
- **Meal Kits**: HelloFresh FR, Quitoque

#### **Australia (AU)**
- **Grocery**: Woolworths, Coles, Amazon Fresh AU
- **Delivery**: Uber Eats, Menulog, DoorDash AU
- **Meal Kits**: HelloFresh AU, Marley Spoon AU

### SQL Template for Adding New Countries

```sql
-- Template: Add new country
INSERT INTO affiliate_partner_map (
  country_code, category, partner_name, partner_url, commission_rate, priority,
  min_order_value, delivery_fee, free_delivery_threshold, delivery_time, coverage,
  affiliate_id, tracking_template, description, benefit
) VALUES
  ('DE', 'grocery', 'Rewe', 'https://rewe.de', 2.00, 1,
   50.00, 5.99, 50.00, 'next-day', 'nationwide',
   'YOUR_AFFILIATE_ID', 'https://rewe.de?partner={affiliate_id}&ref={user_id}',
   'Next-day delivery | Free over €50', 'Free delivery over €50');
```

---

## 📊 Tracking & Analytics

### Monitor Affiliate Performance

```sql
-- Top performing partners
SELECT 
  country_code,
  partner_name,
  COUNT(*) as clicks,
  SUM(CASE WHEN order_completed THEN 1 ELSE 0 END) as conversions,
  ROUND((SUM(CASE WHEN order_completed THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as conversion_rate,
  SUM(commission_earned) as total_revenue
FROM affiliate_performance
GROUP BY country_code, partner_name
ORDER BY total_revenue DESC;

-- Click-through rates by journey
SELECT 
  journey_name,
  partner_name,
  COUNT(*) as shown,
  SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END) as clicks,
  ROUND((SUM(CASE WHEN link_clicked THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as ctr
FROM affiliate_performance
GROUP BY journey_name, partner_name
ORDER BY ctr DESC;

-- Revenue by country
SELECT 
  country_code,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(commission_earned) as total_revenue,
  ROUND(SUM(commission_earned) / COUNT(DISTINCT user_id), 2) as revenue_per_user
FROM affiliate_performance
WHERE order_completed = true
GROUP BY country_code
ORDER BY total_revenue DESC;
```

---

## 🎯 Success Metrics

### **Week 1 Goals:**
- ✅ 3 countries configured (US, UK, CA)
- ✅ 3 categories per country (grocery, delivery, meal_kit)
- ✅ At least 2 partners per category
- ✅ All affiliate IDs obtained and configured
- ✅ Tracking templates tested and working

### **Month 1 Goals:**
- 40% of users click at least one affiliate link
- 15% conversion rate (clicks → orders)
- $1-2 revenue per active user per month

### **Month 3 Goals:**
- 50% of users click affiliate links
- 20% conversion rate
- $2-3 revenue per active user per month
- Expand to 5+ countries

---

## 🚨 Important Notes

### **Compliance:**
1. **Disclosure**: Always disclose affiliate relationships
   - Add to user guide: "We may earn a commission from purchases"
   - Include in affiliate link messages: "💰" emoji indicates affiliate link

2. **Cookie Consent**: Ensure affiliate tracking complies with GDPR/CCPA
   - Tracking URLs use user_id for attribution
   - No third-party cookies required

3. **Terms of Service**: Review each partner's affiliate TOS
   - Amazon: No price manipulation, no misleading claims
   - MealMe: Follow brand guidelines
   - Instacart: Proper attribution required

### **Testing:**
1. Test affiliate links in incognito mode
2. Verify tracking parameters are correct
3. Confirm commissions are being tracked
4. Check that links work in all supported countries

### **Maintenance:**
1. Review affiliate performance monthly
2. Remove underperforming partners
3. Add new partners based on user demand
4. Update commission rates as they change

---

## ✅ Day 3 Checklist

- [x] Database schema created
- [x] Initial partners seeded (US, UK, CA)
- [ ] Sign up for affiliate programs (Priority 1)
- [ ] Obtain affiliate IDs
- [ ] Update database with real affiliate IDs
- [ ] Test affiliate link generation
- [ ] Verify tracking parameters
- [ ] Document compliance requirements
- [ ] Set up performance monitoring queries

---

## 📝 Next Steps

After completing affiliate setup:
1. Move to Day 4: Create Master Prompt Library
2. Integrate affiliate links into conversation flows
3. Test end-to-end user journey with real affiliate links
4. Monitor performance and optimize
