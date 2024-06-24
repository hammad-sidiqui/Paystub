import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { CommonModule } from '@angular/common';

import { HomeComponent } from './home/home.component';
import { StubFormComponent } from './stub-form/stub-form.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { OrderResendComponent } from './order-resend/order-resend.component';
import { StubSamplesComponent } from './stub-samples/stub-samples.component';
import { StubFaqComponent } from './stub-faq/stub-faq.component';
import { W2FormComponent } from './w2-form/w2-form.component';
import { W2FaqComponent } from './w2-faq/w2-faq.component';
import { W2CreatorComponent } from './w2-creator/w2-creator.component';
import { W2SamplesComponent } from './w2-samples/w2-samples.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { BlogComponent } from './blog/blog.component';

const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'create-stub', component: StubFormComponent },
    { path: 'about-us', component: AboutUsComponent },
    { path: 'privacy-policy', component: PrivacyPolicyComponent },
    { path: 'contact-us', component: ContactUsComponent },
    { path: 'order-resend', component: OrderResendComponent },
    { path: 'stub-samples', component: StubSamplesComponent },
    { path: 'stub-faq', component: StubFaqComponent },
    { path: 'w2-form', component: W2FormComponent },
    { path: 'w2-faq', component: W2FaqComponent },
    { path: 'w2-creator', component: W2CreatorComponent },
    // { path: 'w2-samples', component: W2SamplesComponent },
    { path: 'reviews', component: ReviewsComponent },
    { path: 'blog', component: BlogComponent },
];

@NgModule({
//   declarations: [],
  /* imports: [
    CommonModule
  ] */
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
